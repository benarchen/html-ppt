import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { HtmlPptError } from "./errors.js"
import { parseMarkdown } from "./parser.js"
import { planDeck } from "./planner.js"
import { renderDeck } from "./renderer.js"
import { checkAllThemes, loadTheme } from "./theme.js"
import { LAYOUTS, type Deck, type PlannedDeck, type PreflightReport, type ThemePackage } from "./types.js"
import { isInside, sha256 } from "./utils.js"
import { HTML_PPT_VERSION } from "./version.js"

export interface CompileOptions {
  projectRoot: string
  inputPath: string
  themeName?: string
}

export interface CompiledDeck {
  deck: Deck
  plannedDeck: PlannedDeck
  theme: ThemePackage
  html: string
  buildId: string
  source: string
}

export interface BuildResult extends CompiledDeck {
  outputDirectory: string
  htmlPath: string
  irPath: string
  plannedIrPath: string
  metadataPath: string
}

export async function compileDeck(options: CompileOptions): Promise<CompiledDeck> {
  const projectRoot = path.resolve(options.projectRoot)
  const inputPath = path.resolve(options.inputPath)
  let rootReal: string
  let inputReal: string
  try {
    ;[rootReal, inputReal] = await Promise.all([realpath(projectRoot), realpath(inputPath)])
  } catch (error) {
    throw new HtmlPptError("INPUT_MISSING", `输入文件不存在或不可访问：${inputPath}`, { file: inputPath }, error instanceof Error ? error.message : undefined)
  }
  if (!isInside(rootReal, inputReal)) throw new HtmlPptError("INPUT_PATH", "输入文件必须位于项目工作区内", { file: inputPath })
  const source = await readFile(inputReal, "utf8")
  const deck = parseMarkdown(source, { filePath: inputReal, projectRoot: rootReal })
  const themeName = options.themeName ?? deck.meta.theme
  const theme = await loadTheme(rootReal, themeName)
  const plannedDeck = planDeck(deck)
  const html = await renderDeck(plannedDeck, theme, { projectRoot: rootReal, inputPath: inputReal })
  const buildId = sha256(`${source}\0${theme.tokensCss}\0${theme.componentsCss}\0${JSON.stringify(theme.manifest)}\0engine:${HTML_PPT_VERSION}`).slice(0, 16)
  return { deck, plannedDeck, theme, html, buildId, source }
}

export async function writeBuild(compiled: CompiledDeck, outputDirectory: string, allowedRoot = process.cwd()): Promise<BuildResult> {
  const resolvedOutput = path.resolve(outputDirectory)
  const resolvedRoot = path.resolve(allowedRoot)
  if (!isInside(resolvedRoot, resolvedOutput)) throw new HtmlPptError("OUTPUT_PATH", "输出目录必须位于允许的工作区内", { file: resolvedOutput })
  try {
    await stat(resolvedOutput)
    throw new HtmlPptError("OUTPUT_EXISTS", `输出目录已存在：${resolvedOutput}`, { file: resolvedOutput }, "使用新的输出目录，避免覆盖已有产物")
  } catch (error) {
    if (error instanceof HtmlPptError) throw error
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") throw error
  }
  await mkdir(path.dirname(resolvedOutput), { recursive: true })
  const [rootReal, parentReal] = await Promise.all([realpath(resolvedRoot), realpath(path.dirname(resolvedOutput))])
  if (!isInside(rootReal, parentReal)) throw new HtmlPptError("OUTPUT_PATH", "输出目录必须位于允许的工作区内", { file: resolvedOutput })
  await mkdir(resolvedOutput)

  const htmlPath = path.join(resolvedOutput, "index.html")
  const irPath = path.join(resolvedOutput, "deck.ir.json")
  const plannedIrPath = path.join(resolvedOutput, "deck.planned.json")
  const metadataPath = path.join(resolvedOutput, "build.json")
  const metadata = {
    schemaVersion: 1,
    engineVersion: HTML_PPT_VERSION,
    buildId: compiled.buildId,
    source: compiled.deck.meta.source,
    theme: compiled.theme.manifest.name,
    themeVersion: compiled.theme.manifest.version,
    slideCount: compiled.plannedDeck.slides.length,
    runtime: {
      node: process.version,
      renderer: "playwright-chromium",
      chromium: "not-run",
      fontFamilies: [...new Set(Object.values(compiled.theme.manifest.typography).map((role) => role.family))],
    },
  }
  await Promise.all([
    writeFile(htmlPath, compiled.html, { encoding: "utf8", flag: "wx" }),
    writeFile(irPath, `${JSON.stringify(compiled.deck, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(plannedIrPath, `${JSON.stringify(compiled.plannedDeck, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
  ])
  return { ...compiled, outputDirectory: resolvedOutput, htmlPath, irPath, plannedIrPath, metadataPath }
}

export async function recordBrowserMetadata(metadataPath: string, runtime: PreflightReport["runtime"]): Promise<void> {
  const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as Record<string, unknown>
  const currentRuntime = metadata.runtime && typeof metadata.runtime === "object" ? metadata.runtime as Record<string, unknown> : {}
  await writeFile(metadataPath, `${JSON.stringify({
    ...metadata,
    runtime: {
      ...currentRuntime,
      chromium: runtime.browserVersion,
      userAgent: runtime.userAgent,
      fontFamilies: runtime.fontFamilies,
    },
  }, null, 2)}\n`, "utf8")
}

export async function buildDeck(options: CompileOptions & { outputDirectory: string }): Promise<BuildResult> {
  const output = path.resolve(options.outputDirectory)
  const root = path.resolve(options.projectRoot)
  if (!isInside(root, output)) throw new HtmlPptError("OUTPUT_PATH", "输出目录必须位于项目工作区内", { file: output })
  return writeBuild(await compileDeck(options), output, root)
}

export async function checkThemeSpecimens(projectRoot: string): Promise<Array<{ theme: string; slideCount: number }>> {
  const themes = await checkAllThemes(projectRoot)
  const results: Array<{ theme: string; slideCount: number }> = []
  for (const theme of themes) {
    const specimen = path.join(theme.root, "specimen.md")
    const compiled = await compileDeck({ projectRoot, inputPath: specimen, themeName: theme.manifest.name })
    const layouts = new Set(compiled.plannedDeck.slides.map((slide) => slide.layout))
    const missing = LAYOUTS.filter((layout) => !layouts.has(layout))
    if (missing.length > 0) {
      throw new HtmlPptError("THEME_SPECIMEN", `主题 ${theme.manifest.name} 的 specimen 未覆盖布局：${missing.join(", ")}`, { file: specimen })
    }
    results.push({ theme: theme.manifest.name, slideCount: compiled.plannedDeck.slides.length })
  }
  return results
}
