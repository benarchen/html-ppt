import { pathToFileURL } from "node:url"
import type { Browser, Page } from "@playwright/test"
import { HtmlPptError } from "./errors.js"

export interface PageDiagnostics {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
}

export async function withRenderedPage<T>(
  htmlPath: string,
  deviceScaleFactor: number,
  action: (page: Page, diagnostics: PageDiagnostics) => Promise<T>,
): Promise<T> {
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0"
  const { chromium } = await import("@playwright/test")
  let browser: Browser | undefined
  try {
    browser = await chromium.launch({ headless: true })
  } catch (error) {
    throw new HtmlPptError("BROWSER_START", "无法启动 Playwright Chromium", { file: htmlPath }, error instanceof Error ? error.message : undefined)
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor })
  const page = await context.newPage()
  const diagnostics: PageDiagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [] }
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message))
  page.on("requestfailed", (request) => diagnostics.failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? "failed"}`))
  await page.route(/^(?:https?:)?\/\//, (route) => route.abort("blockedbyclient"))
  try {
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" })
    await page.waitForFunction(() => document.documentElement.dataset.renderReady === "true", undefined, { timeout: 10_000 })
    return await action(page, diagnostics)
  } finally {
    await context.close()
    await browser.close()
  }
}
