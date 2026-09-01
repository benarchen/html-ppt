import assert from "node:assert/strict"
import { cp, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
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

test("cosmic-mint 背景包含旋转地球、非同步流星和静态降级", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-cosmic-motion-test-"))
  const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: "cosmic-mint" })
  const build = await writeBuild(compiled, path.join(temp, "artifact"), temp)
  await withRenderedPage(build.htmlPath, 1, async (page) => {
    const slides = page.locator(".slide")
    const running = await slides.first().evaluate((slide) => {
      const earth = getComputedStyle(slide, "::before")
      const meteor = getComputedStyle(slide, "::after")
      return {
        galaxyBackground: getComputedStyle(slide).backgroundImage,
        earthAnimation: earth.animationName,
        earthBackground: earth.backgroundImage,
        earthDuration: earth.animationDuration,
        meteorAnimation: meteor.animationName,
        meteorBackground: meteor.backgroundImage,
        meteorDuration: meteor.animationDuration,
        meteorDelay: meteor.animationDelay,
      }
    })
    const secondMeteor = await slides.nth(1).evaluate((slide) => {
      const meteor = getComputedStyle(slide, "::after")
      return { duration: meteor.animationDuration, delay: meteor.animationDelay }
    })
    assert.match(running.galaxyBackground, /data:image\/svg\+xml;base64/)
    assert.equal(running.earthAnimation, "hp-earth-turn")
    assert.equal(running.earthDuration, "48s")
    assert.match(running.earthBackground, /data:image\/svg\+xml;base64/)
    assert.equal(running.meteorAnimation, "hp-meteor-cross")
    assert.equal(running.meteorBackground.match(/linear-gradient/g)?.length, 2)
    assert.equal(running.meteorDuration, "5.8s")
    assert.notDeepEqual([running.meteorDuration, running.meteorDelay], [secondMeteor.duration, secondMeteor.delay])

    const probe = await page.addStyleTag({ content: ".slide::before,.slide::after{animation-delay:0s!important;animation-duration:2s!important}" })
    const before = await slides.first().evaluate((slide) => ({
      earth: getComputedStyle(slide, "::before").backgroundPosition,
      meteor: getComputedStyle(slide, "::after").transform,
    }))
    await page.waitForTimeout(350)
    const after = await slides.first().evaluate((slide) => ({
      earth: getComputedStyle(slide, "::before").backgroundPosition,
      meteor: getComputedStyle(slide, "::after").transform,
    }))
    assert.notEqual(after.earth, before.earth)
    assert.notEqual(after.meteor, before.meteor)
    await probe.evaluate((element) => element.parentNode?.removeChild(element))

    await page.emulateMedia({ reducedMotion: "reduce" })
    const reduced = await slides.first().evaluate((slide) => ({
      earthAnimation: getComputedStyle(slide, "::before").animationName,
      meteorAnimation: getComputedStyle(slide, "::after").animationName,
      meteorOpacity: getComputedStyle(slide, "::after").opacity,
    }))
    assert.deepEqual(reduced, { earthAnimation: "none", meteorAnimation: "none", meteorOpacity: "0.62" })
  })
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
  const delivery = JSON.parse(await readFile(path.join(project, "release", "delivery.json"), "utf8")) as { status: string; files: string[] }
  const metadata = JSON.parse(await readFile(path.join(project, "release", "build.json"), "utf8")) as { runtime: { chromium: string } }
  const report = JSON.parse(await readFile(path.join(project, "release", "report.json"), "utf8")) as { runtime: { browserVersion: string } }
  assert.equal(delivery.status, "complete")
  assert.equal(delivery.files.includes("deck.pdf"), true)
  assert.equal(delivery.files.includes("theme-review.html"), true)
  assert.equal(metadata.runtime.chromium, report.runtime.browserVersion)
  assert.notEqual(metadata.runtime.chromium, "not-run")

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
