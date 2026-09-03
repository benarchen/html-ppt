import assert from "node:assert/strict"
import { cp, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import JSZip from "jszip"
import { compileDeck, writeBuild } from "../../src/build.js"
import { withRenderedPage } from "../../src/browser.js"
import { exportContactSheet, exportPdf, exportPng, exportThemeReview } from "../../src/exporter.js"
import { runPreflight } from "../../src/preflight.js"
import { loadTheme } from "../../src/theme.js"

const root = process.cwd()
const input = path.join(root, "examples", "specimen.md")

test("真实 Chromium 完成 Preflight、PDF 和 PNG 导出", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-browser-test-"))
  const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: "base-light" })
  const build = await writeBuild(compiled, path.join(temp, "artifact"), temp)
  const report = await runPreflight(build.htmlPath, compiled.theme.manifest, { strict: true })
  assert.equal(report.errors, 0)
  assert.equal(report.warnings, 0)
  assert.equal(report.slideCount, 12)
  assert.match(report.runtime.browserVersion, /^151\./)
  assert.equal(report.runtime.fontFamilies.length > 0, true)

  const pdfPath = path.join(build.outputDirectory, "deck.pdf")
  const pngDirectory = path.join(build.outputDirectory, "slides")
  const pdfPages = await exportPdf(build.htmlPath, pdfPath)
  const pngFiles = await exportPng(build.htmlPath, pngDirectory)
  const contactSheet = await exportContactSheet(build.outputDirectory, pngFiles, "测试总览")
  const review = await exportThemeReview(build.outputDirectory, pngFiles, await loadTheme(root, "editorial-dark"))
  assert.equal(pngFiles.length, 12)
  assert.equal(pdfPages, 12)
  const png = await readFile(pngFiles[0]!)
  assert.equal(png.readUInt32BE(16), 2560)
  assert.equal(png.readUInt32BE(20), 1440)
  assert.match(await readFile(contactSheet, "utf8"), /slides\/slide-01\.png/)
  assert.ok(review)
  assert.match(await readFile(review, "utf8"), /Style Spec/)
  assert.match(await readFile(review, "utf8"), /data:image\/svg\+xml;base64/)

  const pdf = await getDocument({ data: new Uint8Array(await readFile(pdfPath)) }).promise
  assert.equal(pdf.numPages, 12)
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  assert.ok(Math.abs(viewport.width - 959.976) < 1)
  assert.ok(Math.abs(viewport.height - 540) < 1)
})

test("浏览器窗口变化只缩放固定逻辑画布", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-scale-test-"))
  const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: "base-light" })
  const build = await writeBuild(compiled, path.join(temp, "artifact"), temp)
  await withRenderedPage(build.htmlPath, 1, async (page) => {
    await page.setViewportSize({ width: 640, height: 360 })
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--hp-preview-scale").trim() === "0.5")
    const small = await page.locator(".slide").first().evaluate((slide) => ({
      cssWidth: getComputedStyle(slide).width,
      cssHeight: getComputedStyle(slide).height,
      renderedWidth: slide.getBoundingClientRect().width,
    }))
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--hp-preview-scale").trim() === "1.5")
    const large = await page.locator(".slide").first().evaluate((slide) => ({
      cssWidth: getComputedStyle(slide).width,
      cssHeight: getComputedStyle(slide).height,
      renderedWidth: slide.getBoundingClientRect().width,
    }))
    assert.deepEqual([small.cssWidth, small.cssHeight, large.cssWidth, large.cssHeight], ["1280px", "720px", "1280px", "720px"])
    assert.equal(small.renderedWidth, 640)
    assert.equal(large.renderedWidth, 1920)
  })
})

test("默认 HTML 使用主题化舞台逐页播放并支持稳定导航", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-player-test-"))
  const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: "cosmic-mint" })
  const build = await writeBuild(compiled, path.join(temp, "artifact"), temp)
  await withRenderedPage(build.htmlPath, 1, async (page) => {
    await page.setViewportSize({ width: 3404, height: 1728 })
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--hp-preview-scale").trim() === "2.4")
    const initial = await page.evaluate(() => {
      const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"))
      const active = slides.filter((slide) => getComputedStyle(slide).visibility === "visible")
      const rect = active[0]?.getBoundingClientRect()
      return {
        mode: document.documentElement.dataset.hpMode,
        activeCount: active.length,
        current: document.querySelector(".deck")?.getAttribute("data-current-slide"),
        hash: decodeURIComponent(window.location.hash.slice(1)),
        bodyOverflow: getComputedStyle(document.body).overflow,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        deckBackground: getComputedStyle(document.querySelector<HTMLElement>(".deck")!).backgroundColor,
        deckBackgroundImage: getComputedStyle(document.querySelector<HTMLElement>(".deck")!).backgroundImage,
        stageStarAnimation: getComputedStyle(document.querySelector<HTMLElement>(".deck")!, "::before").animationName,
        leftEdgeElement: document.elementFromPoint(8, window.innerHeight / 2)?.className,
        rightEdgeElement: document.elementFromPoint(window.innerWidth - 8, window.innerHeight / 2)?.className,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        slide: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
      }
    })
    assert.equal(initial.mode, "presentation")
    assert.equal(initial.activeCount, 1)
    assert.equal(initial.current, "1")
    assert.match(initial.hash, /^slide-01-/)
    assert.equal(initial.bodyOverflow, "hidden")
    assert.equal(initial.bodyBackground, "rgb(2, 4, 17)")
    assert.equal(initial.deckBackground, initial.bodyBackground)
    assert.match(initial.deckBackgroundImage, /data:image\/svg\+xml;base64/)
    assert.equal(initial.stageStarAnimation, "hp-stage-firefly")
    assert.equal(initial.leftEdgeElement, "deck")
    assert.equal(initial.rightEdgeElement, "deck")
    assert.equal(initial.scrollHeight, initial.viewportHeight)
    assert.ok(initial.slide)
    assert.equal(initial.slide.left, 166)
    assert.ok(Math.abs(initial.slide.top) < .001)
    assert.equal(initial.slide.width, 3072)
    assert.equal(initial.slide.height, 1728)

    await page.keyboard.press("ArrowRight")
    await page.waitForFunction(() => document.querySelector(".deck")?.getAttribute("data-current-slide") === "2")
    assert.match(decodeURIComponent(new URL(page.url()).hash.slice(1)), /^slide-02-/)
    await page.keyboard.press("Home")
    await page.waitForFunction(() => document.querySelector(".deck")?.getAttribute("data-current-slide") === "1")
    await page.mouse.wheel(0, 60)
    await page.waitForFunction(() => document.querySelector(".deck")?.getAttribute("data-current-slide") === "2")
    await page.keyboard.press("End")
    await page.waitForFunction(() => document.querySelector(".deck")?.getAttribute("data-current-slide") === "12")
    await page.keyboard.press("ArrowRight")
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "12")
    assert.equal(await page.locator('.slide[aria-current="page"]').count(), 1)

    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--hp-preview-scale").trim() === "1.5")
    await page.locator('.slide[aria-current="page"]').evaluate(async (slide) => {
      const transitions = slide.getAnimations().filter((animation) => animation instanceof CSSAnimation && animation.animationName.startsWith("hp-slide-enter"))
      await Promise.all(transitions.map((animation) => animation.finished))
    })
    const widescreen = await page.locator('.slide[aria-current="page"]').evaluate((slide) => {
      const rect = slide.getBoundingClientRect()
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    })
    assert.deepEqual(widescreen, { left: 0, top: 0, width: 1920, height: 1080 })
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "12")

    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--hp-preview-scale").trim() === "0.8")
    const fourThree = await page.locator('.slide[aria-current="page"]').evaluate((slide) => {
      const rect = slide.getBoundingClientRect()
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    })
    assert.deepEqual(fourThree, { left: 0, top: 96, width: 1024, height: 576 })
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "12")

    await page.evaluate(() => { window.location.hash = "missing-slide" })
    await page.waitForFunction(() => document.querySelector(".deck")?.getAttribute("data-current-slide") === "1")
    assert.match(decodeURIComponent(new URL(page.url()).hash.slice(1)), /^slide-01-/)
    await page.evaluate(() => { window.location.hash = document.querySelectorAll<HTMLElement>(".slide")[2]!.id })
    await page.waitForFunction(() => document.querySelector(".deck")?.getAttribute("data-current-slide") === "3")
    await page.evaluate(() => {
      for (let index = 0; index < 4; index += 1) window.dispatchEvent(new WheelEvent("wheel", { deltaY: 8, cancelable: true }))
    })
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "4")
    await page.evaluate(() => {
      for (const deltaY of [7, 5, 3, 2, 1]) {
        window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }))
      }
    })
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "4")
    await page.waitForTimeout(130)
    await page.mouse.wheel(0, 32)
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "5")
    await page.evaluate(() => {
      for (const deltaY of [-32, -24, -16, -8, -4, -2]) {
        window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }))
      }
    })
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "4")
    await page.waitForTimeout(130)
    await page.mouse.wheel(0, 40)
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "5")

    await page.waitForTimeout(130)
    await page.evaluate(() => {
      for (const deltaY of [12, 12, 12, 8, 4, 2, 3, 8, 18, 24]) {
        window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }))
      }
    })
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "7")
    await page.evaluate(() => {
      for (const deltaY of [-12, -12, -12, -8, -4, -2, -3, -8, -18, -24]) {
        window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }))
      }
    })
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "5")
    await page.waitForTimeout(65)
    await page.mouse.wheel(0, 24)
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "6")
    await page.mouse.wheel(0, -24)
    assert.equal(await page.locator(".deck").getAttribute("data-current-slide"), "5")
    assert.equal(await page.locator('.slide[aria-current="page"]').count(), 1)

    await page.emulateMedia({ reducedMotion: "reduce" })
    assert.equal(await page.locator(".slide").first().evaluate((slide) => getComputedStyle(slide).animationName), "none")
  })

  await withRenderedPage(build.htmlPath, 1, async (page) => {
    const slides = page.locator(".slide")
    assert.equal(await slides.count(), 12)
    assert.equal(await slides.evaluateAll((items) => items.every((slide) => getComputedStyle(slide).visibility === "visible")), true)
    assert.equal(await page.evaluate(() => document.documentElement.dataset.hpMode), "render")
    const cardLayouts = await page.locator(".layout-two-column, .layout-comparison").evaluateAll((items) => items.map((slide) => {
      const columns = slide.querySelector<HTMLElement>(".columns")!
      const cards = Array.from(columns.querySelectorAll<HTMLElement>(".column"))
      const columnsHeight = columns.getBoundingClientRect().height
      return {
        flexGrow: getComputedStyle(columns).flexGrow,
        columnsHeight,
        cardHeights: cards.map((card) => card.getBoundingClientRect().height),
        cardsFit: cards.every((card) => card.scrollHeight <= card.clientHeight),
      }
    }))
    assert.equal(cardLayouts.length >= 2, true)
    assert.equal(cardLayouts.every((layout) => layout.flexGrow === "0"), true)
    assert.equal(cardLayouts.every((layout) => layout.columnsHeight < 360), true)
    assert.equal(cardLayouts.every((layout) => layout.cardHeights.every((height) => Math.abs(height - layout.columnsHeight) <= 1)), true)
    assert.equal(cardLayouts.every((layout) => layout.cardsFit), true)
  }, { mode: "render" })
})

test("cosmic-mint 背景包含独立星光、随机多流星和静态降级", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-cosmic-motion-test-"))
  const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: "cosmic-mint" })
  const build = await writeBuild(compiled, path.join(temp, "artifact"), temp)
  assert.doesNotMatch(await readFile(build.htmlPath, "utf8"), /Math\.random/)
  await withRenderedPage(build.htmlPath, 1, async (page) => {
    const slides = page.locator(".slide")
    const running = await slides.first().evaluate((slide) => {
      const deck = document.querySelector<HTMLElement>(".deck")!
      const earth = getComputedStyle(slide, "::before")
      const stars = Array.from(slide.querySelectorAll<HTMLElement>(".hp-star"))
      return {
        galaxyBackground: getComputedStyle(deck).backgroundImage,
        galaxyRepeat: getComputedStyle(deck).backgroundRepeat,
        slideBackground: getComputedStyle(slide).backgroundImage,
        earthAnimation: earth.animationName,
        earthBackground: earth.backgroundImage,
        earthDuration: earth.animationDuration,
        stars: stars.map((star) => ({
          animation: getComputedStyle(star).animationName,
          duration: getComputedStyle(star).animationDuration,
          delay: getComputedStyle(star).animationDelay,
          radius: getComputedStyle(star).borderRadius,
          before: getComputedStyle(star, "::before").content,
          after: getComputedStyle(star, "::after").content,
        })),
      }
    })
    assert.match(running.galaxyBackground, /data:image\/svg\+xml;base64/)
    assert.equal(running.galaxyRepeat.split(", ").every((value) => value === "no-repeat"), true)
    assert.equal(running.slideBackground, "none")
    assert.equal(running.earthAnimation, "hp-earth-turn")
    assert.equal(running.earthDuration, "48s")
    assert.match(running.earthBackground, /data:image\/svg\+xml;base64/)
    assert.equal(running.stars.length, 15)
    assert.equal(running.stars.every((star) => star.animation === "hp-star-firefly"), true)
    assert.equal(new Set(running.stars.map((star) => `${star.duration}/${star.delay}`)).size, 15)
    assert.equal(running.stars.every((star) => star.radius === "50%" && star.before === "none" && star.after === "none"), true)

    const probe = await page.addStyleTag({ content: ".slide::before,.hp-star{animation-delay:0s!important;animation-duration:2s!important}" })
    const before = await slides.first().evaluate((slide) => {
      const stars = Array.from(slide.querySelectorAll<HTMLElement>(".hp-star")).slice(0, 4)
      return {
        earth: getComputedStyle(slide, "::before").backgroundPosition,
        stars: stars.map((star) => ({ opacity: Number(getComputedStyle(star).opacity), rect: star.getBoundingClientRect().toJSON() })),
      }
    })
    await page.waitForTimeout(350)
    const after = await slides.first().evaluate((slide) => {
      const stars = Array.from(slide.querySelectorAll<HTMLElement>(".hp-star")).slice(0, 4)
      return {
        earth: getComputedStyle(slide, "::before").backgroundPosition,
        stars: stars.map((star) => ({ opacity: Number(getComputedStyle(star).opacity), rect: star.getBoundingClientRect().toJSON() })),
      }
    })
    assert.notEqual(after.earth, before.earth)
    assert.equal(after.stars.some((star, index) => Math.abs(star.opacity - before.stars[index]!.opacity) > .05), true)
    assert.equal(after.stars.some((star, index) => Math.abs(star.rect.x - before.stars[index]!.rect.x) > .2 || Math.abs(star.rect.y - before.stars[index]!.rect.y) > .2), true)
    await probe.evaluate((element) => element.parentNode?.removeChild(element))

    await page.waitForFunction(() => Number(document.querySelector(".deck")?.getAttribute("data-meteor-wave")) >= 1 && document.querySelectorAll('.slide[aria-current="page"] .hp-meteor').length >= 1)
    const wave = await page.locator('.slide[aria-current="page"]').evaluate((slide) => {
      const meteors = Array.from(slide.querySelectorAll<HTMLElement>(".hp-meteor"))
      return {
        seed: document.documentElement.dataset.hpMotionSeed,
        count: Number(document.querySelector(".deck")?.getAttribute("data-meteor-wave-count")),
        nextDelay: Number(document.querySelector(".deck")?.getAttribute("data-meteor-next-delay")),
        meteors: meteors.map((meteor) => ({
          path: meteor.dataset.path,
          duration: Number(meteor.dataset.duration),
          easing: meteor.getAnimations()[0]?.effect?.getTiming().easing,
        })),
      }
    })
    assert.match(wave.seed ?? "", /^\d+$/)
    assert.equal(wave.count >= 1 && wave.count <= 3, true)
    assert.equal(wave.meteors.length, wave.count)
    assert.equal(new Set(wave.meteors.map((meteor) => meteor.path)).size, wave.count)
    assert.equal(wave.nextDelay >= 3800 && wave.nextDelay <= 9000, true)
    assert.equal(wave.meteors.every((meteor) => meteor.duration >= 1900 && meteor.duration <= 2600), true)
    assert.equal(wave.meteors.every((meteor) => meteor.easing === "linear"), true)
    assert.equal(wave.meteors.every((meteor) => {
      const values = (meteor.path ?? "").split(",").map(Number)
      if (values.length !== 4) return false
      const [startX, startY, endX, endY] = values as [number, number, number, number]
      return startX <= 0 && startY >= 132 && startY <= 500 && endX >= 340 && endX <= 840 && endY < 0
    }), true)

    const meteorBefore = await page.locator('.slide[aria-current="page"] .hp-meteor').first().evaluate((meteor) => getComputedStyle(meteor).translate)
    await page.waitForTimeout(180)
    const meteorAfter = await page.locator('.slide[aria-current="page"] .hp-meteor').first().evaluate((meteor) => getComputedStyle(meteor).translate)
    const parseTranslate = (value: string): [number, number] => {
      const parts = value === "none" ? ["0", "0"] : value.split(/\s+/)
      return [Number.parseFloat(parts[0] ?? "0"), Number.parseFloat(parts[1] ?? "0")]
    }
    const [beforeX, beforeY] = parseTranslate(meteorBefore)
    const [afterX, afterY] = parseTranslate(meteorAfter)
    assert.equal(afterX > beforeX, true)
    assert.equal(afterY < beforeY, true)

    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.waitForFunction(() => document.querySelectorAll(".hp-meteor").length === 0)
    const reduced = await slides.first().evaluate((slide) => ({
      earthAnimation: getComputedStyle(slide, "::before").animationName,
      stageAnimation: getComputedStyle(document.querySelector<HTMLElement>(".deck")!, "::before").animationName,
      meteorCount: slide.querySelectorAll(".hp-meteor").length,
      starAnimations: Array.from(slide.querySelectorAll<HTMLElement>(".hp-star")).map((star) => getComputedStyle(star).animationName),
    }))
    assert.equal(reduced.earthAnimation, "none")
    assert.equal(reduced.stageAnimation, "none")
    assert.equal(reduced.meteorCount, 0)
    assert.equal(reduced.starAnimations.length, 15)
    assert.equal(reduced.starAnimations.every((animation) => animation === "none"), true)
  })

  await withRenderedPage(build.htmlPath, 1, async (page) => {
    const first = page.locator(".slide").first()
    assert.equal(await page.evaluate(() => document.documentElement.dataset.hpMotionSeed), undefined)
    assert.equal(await page.locator(".hp-meteor").count(), 0)
    assert.equal(await first.evaluate((slide) => getComputedStyle(slide, "::before").animationName), "none")
    assert.equal(await first.locator(".hp-star").evaluateAll((stars) => stars.every((star) => getComputedStyle(star).animationName === "none")), true)
  }, { mode: "render" })
})

test("CLI 原子导出写完成标记，失败不产生最终目录", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "html-ppt-atomic-export-"))
  await Promise.all([
    cp(path.join(root, "themes"), path.join(project, "themes"), { recursive: true }),
    cp(path.join(root, "examples"), path.join(project, "examples"), { recursive: true }),
  ])
  const cli = path.join(root, "build", "src", "cli.js")
  const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: "0" }
  const success = spawnSync(process.execPath, [cli, "export", "examples/specimen.md", "--theme", "editorial-dark", "--format", "all", "--output", "release", "--log-level", "quiet"], {
    cwd: project,
    env,
    encoding: "utf8",
    timeout: 60_000,
  })
  assert.equal(success.status, 0, success.stderr)
  assert.equal(success.stdout, "")
  const delivery = JSON.parse(await readFile(path.join(project, "release", "delivery.json"), "utf8")) as {
    status: string
    files: string[]
    artifacts: { pptxPages: number; pptxMode: string; pptxEditable: boolean; pptxSize: string; pptxImageSize: string }
  }
  const metadata = JSON.parse(await readFile(path.join(project, "release", "build.json"), "utf8")) as { runtime: { chromium: string } }
  const report = JSON.parse(await readFile(path.join(project, "release", "report.json"), "utf8")) as { runtime: { browserVersion: string } }
  assert.equal(delivery.status, "complete")
  assert.equal(delivery.files.includes("deck.pdf"), true)
  assert.equal(delivery.files.includes("deck.pptx"), true)
  assert.equal(delivery.files.includes("theme-review.html"), true)
  assert.deepEqual(delivery.artifacts, {
    htmlPages: 12,
    pdfPages: 12,
    pngPages: 12,
    pngSize: "2560x1440",
    pptxPages: 12,
    pptxMode: "flat",
    pptxEditable: false,
    pptxSize: "13.333333x7.5in",
    pptxImageSize: "2560x1440",
  })
  const pptx = await JSZip.loadAsync(await readFile(path.join(project, "release", "deck.pptx")))
  assert.equal(Object.keys(pptx.files).filter((file) => /^ppt\/slides\/slide\d+\.xml$/.test(file)).length, 12)
  assert.equal(Object.keys(pptx.files).filter((file) => /^ppt\/media\/image\d+\.png$/.test(file)).length, 12)
  assert.equal(metadata.runtime.chromium, report.runtime.browserVersion)
  assert.notEqual(metadata.runtime.chromium, "not-run")

  const formatCases = [
    { format: "pdf", output: "pdf-only", present: ["deck.pdf"], absent: ["slides", "deck.pptx"] },
    { format: "png", output: "png-only", present: ["slides", "contact-sheet.html"], absent: ["deck.pdf", "deck.pptx"] },
    { format: "pptx-flat", output: "pptx-only", present: ["slides", "contact-sheet.html", "deck.pptx"], absent: ["deck.pdf"] },
  ] as const
  for (const formatCase of formatCases) {
    const result = spawnSync(process.execPath, [cli, "export", "examples/specimen.md", "--theme", "base-light", "--format", formatCase.format, "--output", formatCase.output, "--log-level", "quiet"], {
      cwd: project,
      env,
      encoding: "utf8",
      timeout: 60_000,
    })
    assert.equal(result.status, 0, result.stderr)
    for (const file of formatCase.present) await stat(path.join(project, formatCase.output, file))
    for (const file of formatCase.absent) {
      await assert.rejects(() => stat(path.join(project, formatCase.output, file)), (error) => (error as NodeJS.ErrnoException).code === "ENOENT")
    }
  }

  const failed = spawnSync(process.execPath, [cli, "export", "examples/specimen.md", "--theme", "base-light", "--format", "pdf", "--output", "failed", "--log-level", "quiet"], {
    cwd: project,
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.join(project, "missing-browsers") },
    encoding: "utf8",
    timeout: 60_000,
  })
  assert.equal(failed.status, 1)
  assert.match(failed.stderr, /BROWSER_START/)
  await assert.rejects(() => stat(path.join(project, "failed")), (error) => (error as NodeJS.ErrnoException).code === "ENOENT")
  const partials = (await readdir(project)).filter((entry) => entry.startsWith("failed.partial-"))
  assert.equal(partials.length, 1)
  await assert.rejects(() => stat(path.join(project, partials[0]!, "delivery.json")), (error) => (error as NodeJS.ErrnoException).code === "ENOENT")
})

test("Preflight 能定位画布、溢出、越界、重叠、字体、图片和页面异常", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-invalid-page-"))
  const htmlPath = path.join(temp, "invalid.html")
  await writeFile(htmlPath, `<!doctype html><html><style>
    @font-face{font-family:Broken;src:url("missing.woff2")}*{box-sizing:border-box}body{margin:0}.slide{position:relative;width:1200px;height:700px}.a,.b{position:absolute;width:300px;height:200px}.a{left:10px;top:10px;font:10px Broken}.b{left:100px;top:100px}.overflow{position:absolute;left:500px;top:500px;width:80px;height:20px;white-space:nowrap}
  </style><body><section class="slide" data-slide-id="bad" data-slide-index="1" data-safe-area="64"><div class="a" data-block data-preflight-box data-min-font="body">bad</div><div class="b" data-block data-preflight-box>overlap</div><div class="overflow" data-block data-preflight-box>this content is intentionally much wider than its box</div><img data-block data-preflight-box src="missing.png" alt="missing"><img data-block data-preflight-box style="position:absolute;left:700px;top:300px;width:100px;height:100px" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" alt="tiny"></section><script>console.error("expected console error");fetch("https://invalid.example/resource").catch(()=>{});setTimeout(()=>{throw new Error("expected page error")},0);setTimeout(()=>{document.documentElement.dataset.renderReady="true"},100)</script></body></html>`)
  const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: "base-light" })
  const defaultReport = await runPreflight(htmlPath, compiled.theme.manifest)
  assert.equal(defaultReport.issues.find((issue) => issue.ruleId === "image-resolution")?.severity, "WARN")
  const report = await runPreflight(htmlPath, compiled.theme.manifest, { strict: true })
  const rules = new Set(report.issues.map((issue) => issue.ruleId))
  assert.equal(rules.has("safe-area"), true)
  assert.equal(rules.has("element-overlap"), true)
  assert.equal(rules.has("image-load"), true)
  assert.equal(rules.has("image-resolution"), true)
  assert.equal(rules.has("font-minimum"), true)
  assert.equal(rules.has("font-load"), true)
  assert.equal(rules.has("canvas-size"), true)
  assert.equal(rules.has("content-overflow"), true)
  assert.equal(rules.has("console-error"), true)
  assert.equal(rules.has("page-error"), true)
  assert.equal(rules.has("request-failed"), true)
  assert.equal(report.issues.find((issue) => issue.ruleId === "image-resolution")?.severity, "ERROR")
})
