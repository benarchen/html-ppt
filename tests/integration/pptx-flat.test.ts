import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { deflateSync } from "node:zlib"
import JSZip from "jszip"
import { HtmlPptError } from "../../src/errors.js"
import { exportPptxFlat } from "../../src/pptx-flat.js"
import { HTML_PPT_VERSION } from "../../src/version.js"

test("pptx-flat 生成 12 页单图满版的标准 16∶9 OOXML", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-pptx-test-"))
  const sourcePng = path.join(temp, "source.png")
  await writeFile(sourcePng, createSolidPng(2560, 1440))
  const output = path.join(temp, "deck.pptx")
  const pageCount = await exportPptxFlat(Array(12).fill(sourcePng) as string[], output, {
    title: "PPTX 结构测试",
    language: "zh-CN",
    buildId: "0123456789abcdef",
    slideLabels: Array.from({ length: 12 }, (_, index) => `slide-${String(index + 1).padStart(2, "0")}-test`),
  })
  assert.equal(pageCount, 12)

  const zip = await JSZip.loadAsync(await readFile(output))
  const presentation = await zip.file("ppt/presentation.xml")!.async("string")
  assert.match(presentation, /<p:sldSz cx="12192000" cy="6858000" type="screen16x9"\/>/)
  assert.equal((presentation.match(/<p:sldId /g) ?? []).length, 12)
  const contentTypes = await zip.file("[Content_Types].xml")!.async("string")
  assert.equal((contentTypes.match(/presentationml\.slide\+xml/g) ?? []).length, 12)
  const presentationRels = await zip.file("ppt/_rels/presentation.xml.rels")!.async("string")
  assert.equal((presentationRels.match(/relationships\/slide"/g) ?? []).length, 12)
  const slideMaster = await zip.file("ppt/slideMasters/slideMaster1.xml")!.async("string")
  assert.match(slideMaster, /<p:sldLayoutId id="2147483649" r:id="rId1"\/>/)
  const appProperties = await zip.file("docProps/app.xml")!.async("string")
  assert.equal(appProperties.includes(`<AppVersion>${HTML_PPT_VERSION}</AppVersion>`), true)

  const sourceHash = createHash("sha256").update(await readFile(sourcePng)).digest("hex")
  for (let pageNumber = 1; pageNumber <= 12; pageNumber += 1) {
    const slide = await zip.file(`ppt/slides/slide${pageNumber}.xml`)!.async("string")
    assert.equal((slide.match(/<p:pic>/g) ?? []).length, 1)
    assert.equal((slide.match(/<p:sp>/g) ?? []).length, 0)
    assert.match(slide, /<a:off x="0" y="0"\/><a:ext cx="12192000" cy="6858000"\/>/)
    assert.match(slide, new RegExp(`descr="第 ${pageNumber} 页 · slide-${String(pageNumber).padStart(2, "0")}-test"`))
    const relationships = await zip.file(`ppt/slides/_rels/slide${pageNumber}.xml.rels`)!.async("string")
    assert.match(relationships, new RegExp(`Target="../media/image${pageNumber}\\.png"`))
    const image = await zip.file(`ppt/media/image${pageNumber}.png`)!.async("nodebuffer")
    assert.equal(createHash("sha256").update(image).digest("hex"), sourceHash)
  }
})

test("pptx-flat 拒绝无效输入且不留下输出文件", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-pptx-invalid-"))
  const sourcePng = path.join(temp, "source.png")
  await writeFile(sourcePng, createSolidPng(2560, 1440))
  const output = path.join(temp, "deck.pptx")
  await assert.rejects(
    () => exportPptxFlat([], output, { title: "空", language: "zh-CN", buildId: "build", slideLabels: [] }),
    (error) => error instanceof HtmlPptError && error.code === "PPTX_INPUT_EMPTY",
  )
  await assert.rejects(() => stat(output), (error) => (error as NodeJS.ErrnoException).code === "ENOENT")

  await assert.rejects(
    () => exportPptxFlat([sourcePng], output, { title: "标签", language: "zh-CN", buildId: "build", slideLabels: [] }),
    (error) => error instanceof HtmlPptError && error.code === "PPTX_LABEL_COUNT",
  )
  await assert.rejects(() => stat(output), (error) => (error as NodeJS.ErrnoException).code === "ENOENT")

  const badPng = path.join(temp, "bad.png")
  await writeFile(badPng, "not a png")
  await assert.rejects(
    () => exportPptxFlat([badPng], output, { title: "图片", language: "zh-CN", buildId: "build", slideLabels: ["slide-01"] }),
    (error) => error instanceof HtmlPptError && error.code === "PPTX_PNG_INVALID",
  )
  await assert.rejects(() => stat(output), (error) => (error as NodeJS.ErrnoException).code === "ENOENT")

  const singlePageOutput = path.join(temp, "single.pptx")
  assert.equal(await exportPptxFlat([sourcePng], singlePageOutput, {
    title: "单页",
    language: "zh-CN",
    buildId: "build",
    slideLabels: ["slide-01"],
  }), 1)
  await assert.rejects(
    () => exportPptxFlat([sourcePng], singlePageOutput, { title: "覆盖", language: "zh-CN", buildId: "build", slideLabels: ["slide-01"] }),
    (error) => error instanceof HtmlPptError && error.code === "OUTPUT_EXISTS",
  )

  const missingParentOutput = path.join(temp, "missing", "deck.pptx")
  await assert.rejects(
    () => exportPptxFlat([sourcePng], missingParentOutput, { title: "写入", language: "zh-CN", buildId: "build", slideLabels: ["slide-01"] }),
    (error) => error instanceof HtmlPptError && error.code === "PPTX_WRITE",
  )
  await assert.rejects(() => stat(missingParentOutput), (error) => (error as NodeJS.ErrnoException).code === "ENOENT")
})

function createSolidPng(width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const scanline = Buffer.alloc(1 + width * 3)
  const raw = Buffer.alloc(scanline.length * height)
  for (let row = 0; row < height; row += 1) scanline.copy(raw, row * scanline.length)
  return Buffer.concat([signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))])
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii")
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  typeBuffer.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length)
  return chunk
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const value of data) {
    crc ^= value
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}
