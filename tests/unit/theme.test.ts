import assert from "node:assert/strict"
import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { checkAllThemes, loadTheme } from "../../src/theme.js"
import { HtmlPptError } from "../../src/errors.js"
import { sha256 } from "../../src/utils.js"

test("两个主题通过同一契约", async () => {
  const themes = await checkAllThemes(process.cwd())
  assert.deepEqual(themes.map((theme) => theme.manifest.name), ["base-light", "editorial-dark"])
  assert.deepEqual(themes[0]!.manifest.supportedLayouts, themes[1]!.manifest.supportedLayouts)
})

test("主题 CSS 不包含远程资源", async () => {
  for (const name of ["base-light", "editorial-dark"]) {
    const theme = await loadTheme(process.cwd(), name)
    assert.doesNotMatch(`${theme.tokensCss}\n${theme.componentsCss}`, /@import|https?:\/\//i)
  }
})

test("参考图 Style Spec 的来源和哈希可追溯", async () => {
  const themeRoot = path.join(process.cwd(), "themes", "editorial-dark")
  const spec = JSON.parse(await readFile(path.join(themeRoot, "style-spec.json"), "utf8")) as {
    source: { reference: string; license: string; sha256: string }
    confidence: Record<string, string>
    unresolved: unknown[]
  }
  const reference = await readFile(path.join(themeRoot, spec.source.reference))
  assert.equal(spec.source.license, "project-owned")
  assert.equal(sha256(reference), spec.source.sha256)
  assert.equal(Object.values(spec.confidence).every((value) => ["high", "medium", "low"].includes(value)), true)
  assert.equal(Array.isArray(spec.unresolved), true)
})

type ThemeMutation = (files: { manifest: Record<string, unknown>; tokens: string; components: string }) => void

async function expectBrokenTheme(code: string, mutate: ThemeMutation): Promise<void> {
  const project = await mkdtemp(path.join(os.tmpdir(), "html-ppt-theme-contract-"))
  const target = path.join(project, "themes", "broken")
  await mkdir(path.join(project, "themes"), { recursive: true })
  await cp(path.join(process.cwd(), "themes", "base-light"), target, { recursive: true })
  const manifestPath = path.join(target, "theme.json")
  const tokensPath = path.join(target, "tokens.css")
  const componentsPath = path.join(target, "components.css")
  const files = {
    manifest: JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>,
    tokens: await readFile(tokensPath, "utf8"),
    components: await readFile(componentsPath, "utf8"),
  }
  files.manifest.name = "broken"
  mutate(files)
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(files.manifest, null, 2)}\n`),
    writeFile(tokensPath, files.tokens),
    writeFile(componentsPath, files.components),
  ])
  await assert.rejects(() => loadTheme(project, "broken"), (error) => error instanceof HtmlPptError && error.code === code)
}

test("主题契约拒绝缺失 token、布局、字体、远程资源和隐藏内容", async () => {
  await expectBrokenTheme("THEME_TOKEN", (files) => { files.tokens = files.tokens.replace("--hp-color-accent:", "--missing-color-accent:") })
  await expectBrokenTheme("THEME_LAYOUTS", (files) => { (files.manifest.supportedLayouts as unknown[]).pop() })
  await expectBrokenTheme("THEME_TYPOGRAPHY", (files) => { ((files.manifest.typography as Record<string, unknown>).body as Record<string, unknown>).family = "" })
  await expectBrokenTheme("THEME_REMOTE_ASSET", (files) => { files.components += "\n.remote{background:url(https://example.com/a.png)}\n" })
  await expectBrokenTheme("THEME_HIDDEN_CONTENT", (files) => { files.components += "\n.hidden{display:none}\n" })
  await expectBrokenTheme("THEME_ASSET_MISSING", (files) => { files.components += "\n.local{background:url(assets/missing.png)}\n" })
})

test("主题契约拒绝缺失文件和越界符号链接", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "html-ppt-theme-path-"))
  const themes = path.join(project, "themes")
  const outside = await mkdtemp(path.join(os.tmpdir(), "html-ppt-theme-outside-"))
  await mkdir(path.join(themes, "missing"), { recursive: true })
  await symlink(outside, path.join(themes, "linked"), "dir")
  await assert.rejects(() => loadTheme(project, "missing"), (error) => error instanceof HtmlPptError && error.code === "THEME_FILE")
  await assert.rejects(() => loadTheme(project, "linked"), (error) => error instanceof HtmlPptError && error.code === "THEME_PATH")
})
