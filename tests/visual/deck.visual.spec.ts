import { access, mkdtemp, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { expect, test } from "@playwright/test"
import { pathToFileURL } from "node:url"
import { compileDeck } from "../../build/src/build.js"

const root = process.cwd()
const input = path.join(root, "examples", "specimen.md")

for (const theme of ["base-light", "cosmic-mint", "editorial-dark"] as const) {
  test(`${theme} 的 12 种布局匹配视觉基线`, async ({ page }) => {
    const temp = await mkdtemp(path.join(os.tmpdir(), `html-ppt-visual-${theme}-`))
    const htmlPath = path.join(temp, "index.html")
    const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: theme })
    await writeFile(htmlPath, compiled.html)
    const url = pathToFileURL(htmlPath)
    url.searchParams.set("mode", "render")
    await page.goto(url.href)
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

test("Goal 002 私有真实文稿的代表页面匹配本地视觉基线", async ({ page }) => {
  const input = path.join(root, "inputs-private", "goal-002", "deck.md")
  try {
    await access(input)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") test.skip(true, "本地私有输入不存在")
    throw error
  }
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-visual-goal-002-private-"))
  const htmlPath = path.join(temp, "index.html")
  const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: "cosmic-mint" })
  await writeFile(htmlPath, compiled.html)
  const url = pathToFileURL(htmlPath)
  url.searchParams.set("mode", "render")
  await page.goto(url.href)
  await page.waitForFunction(() => document.documentElement.dataset.renderReady === "true")
  const slides = page.locator(".slide")
  await expect(slides).toHaveCount(27)
  for (const index of [0, 3, 8, 9, 14, 20, 26]) {
    await expect(slides.nth(index)).toHaveScreenshot(`goal-002-private-slide-${String(index + 1).padStart(2, "0")}.png`, {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.001,
    })
  }
})
