import assert from "node:assert/strict"
import { cp, mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { checkThemeSpecimens, compileDeck, writeBuild } from "../../src/build.js"
import { HtmlPptError } from "../../src/errors.js"
import { startPreview } from "../../src/preview.js"
import { HTML_PPT_VERSION } from "../../src/version.js"

const root = process.cwd()
const input = path.join(root, "examples", "specimen.md")

test("同一 Markdown 使用两个主题生成相同页序", async () => {
  const light = await compileDeck({ projectRoot: root, inputPath: input, themeName: "base-light" })
  const dark = await compileDeck({ projectRoot: root, inputPath: input, themeName: "editorial-dark" })
  assert.equal(light.plannedDeck.slides.length, 12)
  assert.equal(dark.plannedDeck.slides.length, 12)
  assert.deepEqual(light.plannedDeck.slides.map((slide) => slide.id), dark.plannedDeck.slides.map((slide) => slide.id))
  assert.notEqual(light.html, dark.html)
  assert.doesNotMatch(light.html, /<script>alert|https?:\/\//i)
  assert.match(light.html, /dataset\.renderReady/)
})

test("同一输入、主题和引擎重复编译结果稳定", async () => {
  const first = await compileDeck({ projectRoot: root, inputPath: input, themeName: "base-light" })
  const second = await compileDeck({ projectRoot: root, inputPath: input, themeName: "base-light" })
  assert.equal(first.buildId, second.buildId)
  assert.equal(first.html, second.html)
  assert.deepEqual(first.deck, second.deck)
  assert.deepEqual(first.plannedDeck, second.plannedDeck)
})

test("构建产物完整且拒绝覆盖", async () => {
  const compiled = await compileDeck({ projectRoot: root, inputPath: input, themeName: "base-light" })
  const temp = await mkdtemp(path.join(os.tmpdir(), "html-ppt-build-test-"))
  const output = path.join(temp, "artifact")
  const result = await writeBuild(compiled, output, temp)
  await Promise.all([result.htmlPath, result.irPath, result.plannedIrPath, result.metadataPath].map((file) => stat(file)))
  assert.equal(await readFile(input, "utf8"), compiled.source)
  const metadata = JSON.parse(await readFile(result.metadataPath, "utf8")) as { slideCount: number; buildId: string; engineVersion: string }
  assert.equal(metadata.slideCount, 12)
  assert.equal(metadata.buildId.length, 16)
  assert.equal(metadata.engineVersion, HTML_PPT_VERSION)
  for (const file of [result.htmlPath, result.irPath, result.plannedIrPath, result.metadataPath]) {
    assert.doesNotMatch(await readFile(file, "utf8"), new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
  await assert.rejects(() => writeBuild(compiled, output, temp), (error) => error instanceof HtmlPptError && error.code === "OUTPUT_EXISTS")
})

test("缺失资源和未知主题明确失败", async () => {
  await assert.rejects(
    () => compileDeck({ projectRoot: root, inputPath: path.join(root, "tests", "fixtures", "invalid", "missing-image.md") }),
    (error) => error instanceof HtmlPptError && error.code === "RESOURCE_MISSING",
  )
  await assert.rejects(
    () => compileDeck({ projectRoot: root, inputPath: input, themeName: "unknown-theme" }),
    (error) => error instanceof HtmlPptError && error.code === "THEME_FILE",
  )
})

test("每个主题 specimen 覆盖全部标准布局", async () => {
  assert.deepEqual(await checkThemeSpecimens(root), [
    { theme: "base-light", slideCount: 12 },
    { theme: "cosmic-mint", slideCount: 12 },
    { theme: "editorial-dark", slideCount: 12 },
  ])
})

test("CLI 使用稳定退出码", () => {
  const cli = path.join(root, "build", "src", "cli.js")
  const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" })
  assert.equal(help.status, 0)
  assert.equal(help.stdout.split("\n", 1)[0], `html-ppt v${HTML_PPT_VERSION}`)
  assert.match(help.stdout, /--format pdf\|png\|pptx-flat\|all/)
  const invalid = spawnSync(process.execPath, [cli, "unknown"], { encoding: "utf8" })
  assert.equal(invalid.status, 2)
  assert.match(invalid.stderr, /CLI_COMMAND/)

  for (const command of ["build", "preview", "export", "check", "inspect-ir", "check-themes"]) {
    const commandHelp = spawnSync(process.execPath, [cli, command, "--help"], { encoding: "utf8" })
    assert.equal(commandHelp.status, 0)
    assert.equal(commandHelp.stdout.split("\n", 1)[0], `html-ppt v${HTML_PPT_VERSION}`)
  }

  const missingInput = spawnSync(process.execPath, [cli, "build"], { encoding: "utf8" })
  assert.equal(missingInput.status, 2)
  assert.match(missingInput.stderr, /CLI_INPUT/)
})

test("运行时版本与 package.json 保持一致", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as { version: string }
  assert.equal(HTML_PPT_VERSION, packageJson.version)
})

test("CLI 支持相对路径、空格／中文路径和日志级别", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "html ppt 中文 cli project "))
  await Promise.all([
    cp(path.join(root, "themes"), path.join(project, "themes"), { recursive: true }),
    cp(path.join(root, "examples"), path.join(project, "examples"), { recursive: true }),
  ])
  const spacedInput = path.join(project, "examples", "deck 中文 with spaces.md")
  await cp(path.join(project, "examples", "specimen.md"), spacedInput)
  const cli = path.join(root, "build", "src", "cli.js")
  const quiet = spawnSync(process.execPath, [cli, "build", "examples/deck 中文 with spaces.md", "--output", "输出 output with spaces/deck build", "--log-level", "quiet"], {
    cwd: project,
    encoding: "utf8",
  })
  assert.equal(quiet.status, 0, quiet.stderr)
  assert.equal(quiet.stdout, "")
  await stat(path.join(project, "输出 output with spaces", "deck build", "index.html"))

  const verbose = spawnSync(process.execPath, [cli, "build", "examples/deck 中文 with spaces.md", "--output", "verbose-build", "--log-level", "verbose"], {
    cwd: project,
    encoding: "utf8",
  })
  assert.equal(verbose.status, 0, verbose.stderr)
  assert.match(verbose.stdout, /buildId=.*theme=base-light.*slides=12/)

  const escaped = spawnSync(process.execPath, [cli, "build", "examples/deck 中文 with spaces.md", "--output", "../escaped"], { cwd: project, encoding: "utf8" })
  assert.equal(escaped.status, 1)
  assert.match(escaped.stderr, /OUTPUT_PATH/)
})

test("本地预览能够提供页面并在源文件变化后重建", { skip: process.env.HTML_PPT_NETWORK_TESTS !== "1" }, async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "html-ppt-preview-test-"))
  await Promise.all([
    cp(path.join(root, "themes"), path.join(project, "themes"), { recursive: true }),
    cp(path.join(root, "examples"), path.join(project, "examples"), { recursive: true }),
  ])
  const previewInput = path.join(project, "examples", "specimen.md")
  const controller = new AbortController()
  let notifyUrl: ((url: string) => void) | undefined
  const urlPromise = new Promise<string>((resolve) => {
    notifyUrl = resolve
  })
  const preview = startPreview({
    projectRoot: project,
    inputPath: previewInput,
    themeName: "base-light",
    port: 0,
    signal: controller.signal,
    onListening: (url) => notifyUrl?.(url),
  })
  try {
    const url = await urlPromise
    assert.match(await (await fetch(url)).text(), /从 Markdown 到视觉系统/)
    const original = await readFile(previewInput, "utf8")
    await writeFile(previewInput, `${original}\n\n热重载验证标记\n`)
    let rebuilt = false
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      if ((await (await fetch(url)).text()).includes("热重载验证标记")) {
        rebuilt = true
        break
      }
    }
    assert.equal(rebuilt, true)
  } finally {
    controller.abort()
    await preview
  }
})
