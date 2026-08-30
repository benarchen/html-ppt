import { mkdtemp, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { expect, test } from "@playwright/test"
import { pathToFileURL } from "node:url"
import { compileDeck } from "../../build/src/build.js"

const root = process.cwd()
const input = path.join(root, "examples", "specimen.md")

for (const theme of ["base-light", "editorial-dark"] as const) {
  test(`${theme} 的 12 种布局匹配视觉基线`, async ({ page }) => {
    const temp = await mkdtemp(path.join(os.tmpdir(), `html-ppt-visual-${theme}-`))
    const htmlPath = path.join(temp, "index.html")
    const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: theme })
    await writeFile(htmlPath, compiled.html)
    await page.goto(pathToFileURL(htmlPath).href)
    await page.waitForFunction(() => document.documentElement.dataset.renderReady === "true")
    const slides = page.locator(".slide")
    await expect(slides).toHaveCount(12)
    for (let index = 0; index < 12; index += 1) {
      await expect(slides.nth(index)).toHaveScreenshot(`${theme}-slide-${String(index + 1).padStart(2, "0")}.png`, {
        animations: "disabled",
        caret: "hide",
        maxDiffPixelRatio: 0.001,
      })
    }
  })
}
