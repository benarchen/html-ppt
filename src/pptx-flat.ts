import { readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { HtmlPptError } from "./errors.js"
import { HTML_PPT_VERSION } from "./version.js"

const SLIDE_WIDTH_EMU = 12_192_000
const SLIDE_HEIGHT_EMU = 6_858_000
const PNG_WIDTH = 2560
const PNG_HEIGHT = 1440
const ZIP_DATE = new Date("2000-01-01T00:00:00.000Z")

export interface PptxFlatOptions {
  title: string
  language: string
  buildId: string
  slideLabels: string[]
}

export async function exportPptxFlat(
  pngFiles: string[],
  outputPath: string,
  options: PptxFlatOptions,
): Promise<number> {
  await assertMissing(outputPath)
  if (pngFiles.length === 0) throw new HtmlPptError("PPTX_INPUT_EMPTY", "PPTX 至少需要一张 PNG", { file: outputPath })
  if (pngFiles.length !== options.slideLabels.length) {
    throw new HtmlPptError("PPTX_LABEL_COUNT", `PNG 数量 ${pngFiles.length} 与页面标签数量 ${options.slideLabels.length} 不一致`, { file: outputPath })
  }

  try {
    const images: Buffer[] = []
    for (const [index, file] of pngFiles.entries()) {
      const image = await readFile(file)
      assertPng(image, file, index + 1)
      images.push(image)
    }

    const zip = new JSZip()
    const add = (name: string, value: string | Buffer): void => {
      zip.file(name, value, { date: ZIP_DATE, createFolders: false })
    }
    add("[Content_Types].xml", contentTypesXml(images.length))
    add("_rels/.rels", packageRelationshipsXml())
    add("docProps/app.xml", appPropertiesXml(images.length))
    add("docProps/core.xml", corePropertiesXml(options))
    add("ppt/presentation.xml", presentationXml(images.length))
    add("ppt/_rels/presentation.xml.rels", presentationRelationshipsXml(images.length))
    add("ppt/slideMasters/slideMaster1.xml", slideMasterXml())
    add("ppt/slideMasters/_rels/slideMaster1.xml.rels", slideMasterRelationshipsXml())
    add("ppt/slideLayouts/slideLayout1.xml", slideLayoutXml())
    add("ppt/slideLayouts/_rels/slideLayout1.xml.rels", slideLayoutRelationshipsXml())
    add("ppt/theme/theme1.xml", themeXml())

    for (const [index, image] of images.entries()) {
      const pageNumber = index + 1
      add(`ppt/slides/slide${pageNumber}.xml`, slideXml(pageNumber, options.slideLabels[index]!))
      add(`ppt/slides/_rels/slide${pageNumber}.xml.rels`, slideRelationshipsXml(pageNumber))
      add(`ppt/media/image${pageNumber}.png`, image)
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 }, platform: "DOS" })
    await writeFile(outputPath, buffer, { flag: "wx" })
    return images.length
  } catch (error) {
    if (error instanceof HtmlPptError) throw error
    throw new HtmlPptError("PPTX_WRITE", `PPTX 写入失败：${error instanceof Error ? error.message : String(error)}`, { file: outputPath })
  }
}

async function assertMissing(target: string): Promise<void> {
  try {
    await stat(target)
    throw new HtmlPptError("OUTPUT_EXISTS", `输出目标已存在：${target}`, { file: target }, "使用新的输出路径，避免覆盖已有产物")
  } catch (error) {
    if (error instanceof HtmlPptError) throw error
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}

function assertPng(buffer: Buffer, file: string, pageNumber: number): void {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new HtmlPptError("PPTX_PNG_INVALID", `第 ${pageNumber} 页不是有效 PNG`, { file })
  }
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  if (width !== PNG_WIDTH || height !== PNG_HEIGHT) {
    throw new HtmlPptError("PPTX_PNG_SIZE", `第 ${pageNumber} 页 PNG 尺寸不是 ${PNG_WIDTH} × ${PNG_HEIGHT}`, { file })
  }
}

function contentTypesXml(slideCount: number): string {
  const slides = Array.from({ length: slideCount }, (_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")
  return xml(`
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${slides}
</Types>`)
}

function packageRelationshipsXml(): string {
  return xml(`
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`)
}

function presentationXml(slideCount: number): string {
  const slides = Array.from({ length: slideCount }, (_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("")
  return xml(`
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${slides}</p:sldIdLst>
  <p:sldSz cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle/>
</p:presentation>`)
}

function presentationRelationshipsXml(slideCount: number): string {
  const slides = Array.from({ length: slideCount }, (_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("")
  return xml(`
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slides}
</Relationships>`)
}

function slideXml(pageNumber: number, label: string): string {
  const description = escapeXml(`第 ${pageNumber} 页 · ${label}`)
  return xml(`
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    <p:pic>
      <p:nvPicPr><p:cNvPr id="2" name="Slide image ${pageNumber}" descr="${description}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
      <p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
      <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
    </p:pic>
  </p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`)
}

function slideRelationshipsXml(pageNumber: number): string {
  return xml(`
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${pageNumber}.png"/>
</Relationships>`)
}

function slideMasterXml(): string {
  return xml(`
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="html-ppt"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:defPPr><a:defRPr/></a:defPPr></p:otherStyle></p:txStyles>
</p:sldMaster>`)
}

function slideMasterRelationshipsXml(): string {
  return xml(`
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`)
}

function slideLayoutXml(): string {
  return xml(`
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`)
}

function slideLayoutRelationshipsXml(): string {
  return xml(`
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`)
}

function themeXml(): string {
  return xml(`
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="html-ppt">
  <a:themeElements>
    <a:clrScheme name="html-ppt"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme>
    <a:fontScheme name="html-ppt"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="html-ppt"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`)
}

function appPropertiesXml(slideCount: number): string {
  return xml(`
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>html-ppt</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slideCount}</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides><MMClips>0</MMClips><ScaleCrop>false</ScaleCrop><Company/><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>${HTML_PPT_VERSION}</AppVersion>
</Properties>`)
}

function corePropertiesXml(options: PptxFlatOptions): string {
  return xml(`
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(options.title)}</dc:title><dc:creator>html-ppt</dc:creator><dc:language>${escapeXml(options.language)}</dc:language><cp:lastModifiedBy>html-ppt</cp:lastModifiedBy><cp:keywords>flat;editable:false;build:${escapeXml(options.buildId)}</cp:keywords><dcterms:created xsi:type="dcterms:W3CDTF">2000-01-01T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2000-01-01T00:00:00Z</dcterms:modified>
</cp:coreProperties>`)
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")
}

function xml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body.replace(/>\s+</g, "><").trim()}`
}
