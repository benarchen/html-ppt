import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { withRenderedPage } from "./browser.js"
import { HtmlPptError } from "./errors.js"
import type { ThemePackage } from "./types.js"
import { resolveWorkspaceFile } from "./utils.js"

export async function exportPdf(htmlPath: string, outputPath: string): Promise<number> {
  await assertMissing(outputPath)
  const buffer = await withRenderedPage(htmlPath, 1, async (page) => {
    await page.emulateMedia({ media: "print" })
    return page.pdf({
      width: "13.333in",
      height: "7.5in",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
    })
  }, { mode: "render" })
  const pageCount = (buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length
  if (pageCount === 0) throw new HtmlPptError("EXPORT_PDF_PAGES", "Chromium 生成的 PDF 不包含可识别页面", { file: outputPath })
  await writeFile(outputPath, buffer, { flag: "wx" })
  return pageCount
}

export async function exportPng(htmlPath: string, outputDirectory: string): Promise<string[]> {
  await assertMissing(outputDirectory)
  await mkdir(outputDirectory)
  return withRenderedPage(htmlPath, 2, async (page) => {
    const slides = page.locator(".slide")
    const count = await slides.count()
    const files: string[] = []
    for (let index = 0; index < count; index += 1) {
      const file = path.join(outputDirectory, `slide-${String(index + 1).padStart(2, "0")}.png`)
      const buffer = await slides.nth(index).screenshot({ animations: "disabled", caret: "hide", scale: "device" })
      if (buffer.readUInt32BE(16) !== 2560 || buffer.readUInt32BE(20) !== 1440) {
        throw new HtmlPptError("EXPORT_PNG_SIZE", `PNG 尺寸不是 2560 × 1440：第 ${index + 1} 页`, { file })
      }
      await writeFile(file, buffer, { flag: "wx" })
      files.push(file)
    }
    return files
  }, { mode: "render" })
}

export async function exportContactSheet(outputDirectory: string, pngFiles: string[], title: string): Promise<string> {
  const outputPath = path.join(outputDirectory, "contact-sheet.html")
  await assertMissing(outputPath)
  const cards = pngFiles.map((file, index) => {
    const relative = path.relative(outputDirectory, file).split(path.sep).join("/")
    return `<figure><img src="${relative}" alt="第 ${index + 1} 页"><figcaption>${String(index + 1).padStart(2, "0")}</figcaption></figure>`
  }).join("\n")
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeText(title)}</title><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#111318;color:#f1eee6;font-family:Arial,sans-serif}h1{margin:0 0 28px;font-size:28px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}figure{margin:0;background:#1b1e26;border:1px solid #353946}img{display:block;width:100%;height:auto}figcaption{padding:10px 14px;color:#a8a6a0;font:700 12px/1 monospace}</style></head><body><h1>${escapeText(title)}</h1><main class="grid">${cards}</main></body></html>\n`
  await writeFile(outputPath, html, { encoding: "utf8", flag: "wx" })
  return outputPath
}

export async function exportThemeReview(outputDirectory: string, pngFiles: string[], theme: ThemePackage): Promise<string | undefined> {
  const styleSpecPath = path.join(theme.root, "style-spec.json")
  let styleSpecRaw: string
  try {
    styleSpecRaw = await readFile(styleSpecPath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
  const styleSpec = JSON.parse(styleSpecRaw) as { source?: { reference?: unknown } }
  const reference = styleSpec.source?.reference
  let referenceHtml = "<p>未提供参考图。</p>"
  if (typeof reference === "string" && reference) {
    const referencePath = await resolveWorkspaceFile(theme.root, theme.root, reference, "THEME_REFERENCE_PATH")
    const extension = path.extname(referencePath).toLowerCase()
    const mime = extension === ".svg" ? "image/svg+xml" : extension === ".png" ? "image/png" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "application/octet-stream"
    const data = await readFile(referencePath)
    referenceHtml = `<img class="reference" src="data:${mime};base64,${data.toString("base64")}" alt="主题参考图">`
  }
  const thumbnails = pngFiles.map((file, index) => {
    const relative = path.relative(outputDirectory, file).split(path.sep).join("/")
    return `<figure><img src="${relative}" alt="第 ${index + 1} 页"><figcaption>${String(index + 1).padStart(2, "0")}</figcaption></figure>`
  }).join("")
  const outputPath = path.join(outputDirectory, "theme-review.html")
  await assertMissing(outputPath)
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeText(theme.manifest.name)} 主题审核</title><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#101114;color:#f1eee6;font-family:Arial,sans-serif}h1,h2{margin:0 0 20px}.summary{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;margin-bottom:32px}.panel{min-width:0;padding:20px;background:#1b1e26;border:1px solid #353946}.reference{display:block;width:100%;height:auto}pre{max-height:520px;margin:0;padding:16px;overflow:auto;background:#0b0d11;color:#d8ff57;font:12px/1.5 monospace;white-space:pre-wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}figure{margin:0;background:#1b1e26;border:1px solid #353946}figure img{display:block;width:100%}figcaption{padding:8px 12px;color:#a8a6a0;font:700 12px/1 monospace}@media(max-width:800px){.summary{grid-template-columns:1fr}}</style></head><body><h1>${escapeText(theme.manifest.name)} 主题审核</h1><section class="summary"><article class="panel"><h2>参考图</h2>${referenceHtml}</article><article class="panel"><h2>Style Spec</h2><pre>${escapeText(JSON.stringify(styleSpec, null, 2))}</pre></article><article class="panel"><h2>Theme Manifest</h2><pre>${escapeText(JSON.stringify(theme.manifest, null, 2))}</pre></article><article class="panel"><h2>Tokens</h2><pre>${escapeText(theme.tokensCss)}</pre></article></section><h2>全部页面</h2><main class="grid">${thumbnails}</main></body></html>\n`
  await writeFile(outputPath, html, { encoding: "utf8", flag: "wx" })
  return outputPath
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

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
