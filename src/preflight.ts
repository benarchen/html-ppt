import { writeFile } from "node:fs/promises"
import path from "node:path"
import type { PageDiagnostics } from "./browser.js"
import { withRenderedPage } from "./browser.js"
import { HtmlPptError } from "./errors.js"
import type { Issue, PreflightReport, ThemeManifest } from "./types.js"

interface BrowserFinding {
  ruleId: string
  severity: "ERROR" | "WARN"
  message: string
  slideId?: string
  slideIndex?: number
  sourceLine?: number
  hint?: string
}

export async function runPreflight(
  htmlPath: string,
  manifest: ThemeManifest,
  options: { strict?: boolean; reportPath?: string } = {},
): Promise<PreflightReport> {
  const report = await withRenderedPage(htmlPath, 1, async (page, diagnostics) => {
    const findings = await page.evaluate((minimums) => {
      const issues: BrowserFinding[] = []
      const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"))
      if (slides.length === 0) issues.push({ ruleId: "slide-count", severity: "ERROR", message: "HTML 不包含 slide" })
      for (const slide of slides) inspectSlide(slide, issues, minimums)
      if (document.fonts.status !== "loaded") issues.push({ ruleId: "font-load", severity: "ERROR", message: "字体未完成加载" })
      document.fonts.forEach((font) => {
        if (font.status === "error") issues.push({ ruleId: "font-load", severity: "ERROR", message: `字体加载失败：${font.family}` })
      })
      for (const image of Array.from(document.images)) {
        const slide = image.closest<HTMLElement>(".slide")
        if (!image.complete || image.naturalWidth === 0) {
          issues.push(issueFor(slide, image, "image-load", "ERROR", `图片加载失败：${image.alt || "未提供替代文字"}`, "检查本地图片路径"))
        } else if (image.naturalWidth < image.clientWidth || image.naturalHeight < image.clientHeight) {
          issues.push(issueFor(slide, image, "image-resolution", "WARN", "图片原始分辨率低于显示尺寸", "使用更高分辨率图片"))
        }
      }
      return { slideCount: slides.length, issues }

      function inspectSlide(slide: HTMLElement, output: BrowserFinding[], mins: Record<string, number>): void {
        const slideRect = slide.getBoundingClientRect()
        if (Math.abs(slideRect.width - 1280) > 0.5 || Math.abs(slideRect.height - 720) > 0.5) {
          output.push(issueFor(slide, slide, "canvas-size", "ERROR", `画布尺寸错误：${slideRect.width} × ${slideRect.height}`))
        }
        const safe = Number(slide.dataset.safeArea ?? 0)
        const blocks = Array.from(slide.querySelectorAll<HTMLElement>("[data-block]"))
        for (const block of blocks) {
          const rect = block.getBoundingClientRect()
          if (block.scrollWidth > block.clientWidth + 3 || block.scrollHeight > block.clientHeight + 3) {
            output.push(issueFor(slide, block, "content-overflow", "ERROR", `内容发生溢出：${block.scrollWidth} × ${block.scrollHeight}，容器 ${block.clientWidth} × ${block.clientHeight}`, "减少内容、拆页或更换布局"))
          }
          if (block.dataset.allowBleed !== "true") {
            const outside = rect.left < slideRect.left + safe - 1 || rect.top < slideRect.top + safe - 1 || rect.right > slideRect.right - safe + 1 || rect.bottom > slideRect.bottom - safe + 1
            if (outside) output.push(issueFor(slide, block, "safe-area", "ERROR", "内容越过安全区", "调整布局或内容预算"))
          }
          const role = block.dataset.minFont
          if (role && role in mins) {
            const size = Number.parseFloat(getComputedStyle(block).fontSize)
            if (size < mins[role]!) output.push(issueFor(slide, block, "font-minimum", "ERROR", `字号 ${size}px 低于 ${role} 最小值 ${mins[role]}px`))
          }
        }
        const boxes = Array.from(slide.querySelectorAll<HTMLElement>("[data-preflight-box]"))
        for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
            const left = boxes[leftIndex]!
            const right = boxes[rightIndex]!
            if (left.contains(right) || right.contains(left)) continue
            if (left.dataset.allowBleed === "true" || right.dataset.allowBleed === "true") continue
            const a = left.getBoundingClientRect()
            const b = right.getBoundingClientRect()
            const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
            const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
            const area = width * height
            const smaller = Math.min(a.width * a.height, b.width * b.height)
            if (smaller > 0 && area / smaller > 0.2) {
              output.push(issueFor(slide, left, "element-overlap", "ERROR", "检测到非预期元素重叠", "调整布局间距或内容预算"))
            }
          }
        }
      }

      function issueFor(slide: HTMLElement | null, element: HTMLElement, ruleId: string, severity: "ERROR" | "WARN", message: string, hint?: string): BrowserFinding {
        const result: BrowserFinding = {
          ruleId,
          severity,
          message,
          ...(slide?.dataset.slideId ? { slideId: slide.dataset.slideId } : {}),
          ...(slide?.dataset.slideIndex ? { slideIndex: Number(slide.dataset.slideIndex) } : {}),
          ...(element.dataset.sourceLine ? { sourceLine: Number(element.dataset.sourceLine) } : {}),
          ...(hint ? { hint } : {}),
        }
        return result
      }
    }, {
      display: manifest.typography.display.minSize,
      heading: manifest.typography.heading.minSize,
      body: manifest.typography.body.minSize,
      caption: manifest.typography.caption.minSize,
    })
    const runtime = {
      browserVersion: page.context().browser()?.version() ?? "unknown",
      userAgent: await page.evaluate(() => navigator.userAgent),
      fontFamilies: [...new Set(Object.values(manifest.typography).map((role) => role.family))],
    }
    return makeReport(path.basename(htmlPath), findings.slideCount, findings.issues, diagnostics, options.strict ?? false, runtime)
  })
  if (options.reportPath) await writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" })
  return report
}

function makeReport(
  html: string,
  slideCount: number,
  browserIssues: BrowserFinding[],
  diagnostics: PageDiagnostics,
  strict: boolean,
  runtime: PreflightReport["runtime"],
): PreflightReport {
  const issues: Issue[] = browserIssues.map((issue) => ({ ...issue, severity: strict && issue.severity === "WARN" ? "ERROR" : issue.severity }))
  for (const message of diagnostics.consoleErrors) issues.push({ ruleId: "console-error", severity: "ERROR", message })
  for (const message of diagnostics.pageErrors) issues.push({ ruleId: "page-error", severity: "ERROR", message })
  for (const message of diagnostics.failedRequests) issues.push({ ruleId: "request-failed", severity: "ERROR", message, hint: "所有资源必须本地化" })
  return {
    schemaVersion: 1,
    html,
    slideCount,
    generatedAt: new Date().toISOString(),
    errors: issues.filter((issue) => issue.severity === "ERROR").length,
    warnings: issues.filter((issue) => issue.severity === "WARN").length,
    issues,
    runtime,
  }
}

export function assertPreflight(report: PreflightReport): void {
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "ERROR")
    throw new HtmlPptError("PREFLIGHT_FAILED", `Preflight 发现 ${report.errors} 个错误${first ? `，首个错误：${first.ruleId} ${first.message}` : ""}`)
  }
}
