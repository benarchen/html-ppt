import { readFile, realpath, stat } from "node:fs/promises"
import path from "node:path"
import { HtmlPptError } from "./errors.js"
import { LAYOUTS, type LayoutName, type ThemeManifest, type ThemePackage } from "./types.js"
import { isInside, resolveWorkspaceFile } from "./utils.js"

const REQUIRED_TOKEN_VARIABLES = [
  "--hp-font-display",
  "--hp-font-heading",
  "--hp-font-body",
  "--hp-color-background",
  "--hp-color-surface",
  "--hp-color-text",
  "--hp-color-muted",
  "--hp-color-accent",
  "--hp-color-accent-alt",
  "--hp-color-border",
  "--hp-spacing-unit",
  "--hp-radius-small",
  "--hp-radius-large",
] as const

const THEME_ASSET_MIME_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
}

export async function loadTheme(projectRoot: string, themeName: string): Promise<ThemePackage> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(themeName)) {
    throw new HtmlPptError("THEME_NAME", `非法主题名称：${themeName}`)
  }
  const themesRoot = path.resolve(projectRoot, "themes")
  const root = path.resolve(themesRoot, themeName)
  if (!isInside(themesRoot, root)) throw new HtmlPptError("THEME_PATH", "主题路径越出 themes 目录")
  try {
    const [themesReal, rootReal] = await Promise.all([realpath(themesRoot), realpath(root)])
    if (!isInside(themesReal, rootReal)) throw new HtmlPptError("THEME_PATH", "主题符号链接越出 themes 目录")
  } catch (error) {
    if (error instanceof HtmlPptError) throw error
    throw new HtmlPptError("THEME_FILE", `主题不存在或不可访问：${themeName}`, { file: root })
  }

  const manifestPath = path.join(root, "theme.json")
  const tokensPath = path.join(root, "tokens.css")
  const componentsPath = path.join(root, "components.css")
  const specimenPath = path.join(root, "specimen.md")
  let manifestRaw: string
  let tokensCss: string
  let componentsCss: string
  try {
    ;[manifestRaw, tokensCss, componentsCss] = await Promise.all([
      readFile(manifestPath, "utf8"),
      readFile(tokensPath, "utf8"),
      readFile(componentsPath, "utf8"),
      stat(specimenPath),
    ]).then(([manifest, tokens, components]) => [manifest, tokens, components])
  } catch (error) {
    throw new HtmlPptError("THEME_FILE", `主题 ${themeName} 缺少必需文件`, { file: root }, error instanceof Error ? error.message : undefined)
  }

  let raw: unknown
  try {
    raw = JSON.parse(manifestRaw)
  } catch (error) {
    throw new HtmlPptError("THEME_JSON", `主题 Manifest 不是有效 JSON：${themeName}`, { file: manifestPath }, error instanceof Error ? error.message : undefined)
  }
  const manifest = validateManifest(raw, themeName, manifestPath)
  validateCss(tokensCss, componentsCss, manifestPath)
  await validateAssetPaths(root, `${tokensCss}\n${componentsCss}`)
  ;[tokensCss, componentsCss] = await Promise.all([
    inlineThemeAssets(root, tokensCss),
    inlineThemeAssets(root, componentsCss),
  ])
  return { root, manifest, tokensCss, componentsCss }
}

export async function checkAllThemes(projectRoot: string): Promise<ThemePackage[]> {
  const { readdir } = await import("node:fs/promises")
  const themesRoot = path.join(projectRoot, "themes")
  const entries = await readdir(themesRoot, { withFileTypes: true })
  const names = entries.filter((entry) => entry.isDirectory() && entry.name !== "_template").map((entry) => entry.name).sort()
  if (names.length < 2) throw new HtmlPptError("THEME_COUNT", "v0.1 至少需要两个可用主题")
  const themes: ThemePackage[] = []
  for (const name of names) themes.push(await loadTheme(projectRoot, name))
  return themes
}

function validateManifest(raw: unknown, expectedName: string, file: string): ThemeManifest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new HtmlPptError("THEME_SCHEMA", "Theme Manifest 必须是对象", { file })
  const value = raw as Record<string, unknown>
  if (value.name !== expectedName) throw new HtmlPptError("THEME_NAME_MISMATCH", `Manifest name 必须为 ${expectedName}`, { file })
  if (value.schemaVersion !== 1) throw new HtmlPptError("THEME_SCHEMA_VERSION", "只支持 Theme Schema 1", { file })
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+$/.test(value.version)) throw new HtmlPptError("THEME_VERSION", "主题 version 必须是 semver", { file })
  if (value.engine !== ">=0.1 <1") throw new HtmlPptError("THEME_ENGINE", "v0.1 主题 engine 必须为 >=0.1 <1", { file })

  const canvas = object(value.canvas, "canvas", file)
  if (canvas.ratio !== "16:9" || canvas.width !== 1280 || canvas.height !== 720) {
    throw new HtmlPptError("THEME_CANVAS", "主题画布必须为 1280 × 720、16:9", { file })
  }
  numberInRange(canvas.safeArea, 24, 120, "canvas.safeArea", file)
  const grid = object(canvas.grid, "canvas.grid", file)
  if (grid.columns !== 12) throw new HtmlPptError("THEME_GRID", "主题必须使用 12 栏栅格", { file })
  numberInRange(grid.gap, 8, 64, "canvas.grid.gap", file)

  const typography = object(value.typography, "typography", file)
  for (const key of ["display", "heading", "body", "caption"] as const) {
    const role = object(typography[key], `typography.${key}`, file)
    if (typeof role.family !== "string" || role.family.trim() === "") throw new HtmlPptError("THEME_TYPOGRAPHY", `${key}.family 必须是非空字符串`, { file })
    numberInRange(role.minSize, 10, 80, `typography.${key}.minSize`, file)
  }

  const colors = object(value.colors, "colors", file)
  for (const key of ["background", "surface", "text", "muted", "accent", "accentAlt", "border"] as const) {
    if (typeof colors[key] !== "string" || !isCssColor(colors[key] as string)) throw new HtmlPptError("THEME_COLOR", `${key} 必须是 hex 颜色`, { file })
  }

  const spacing = object(value.spacing, "spacing", file)
  numberInRange(spacing.unit, 2, 20, "spacing.unit", file)
  const radii = object(value.radii, "radii", file)
  numberInRange(radii.small, 0, 64, "radii.small", file)
  numberInRange(radii.large, 0, 96, "radii.large", file)
  const shadows = object(value.shadows, "shadows", file)
  if (typeof shadows.card !== "string") throw new HtmlPptError("THEME_SHADOW", "shadows.card 必须是字符串", { file })
  const imageTreatment = object(value.imageTreatment, "imageTreatment", file)
  numberInRange(imageTreatment.radius, 0, 96, "imageTreatment.radius", file)
  if (typeof imageTreatment.filter !== "string") throw new HtmlPptError("THEME_IMAGE", "imageTreatment.filter 必须是字符串", { file })
  if (!Array.isArray(value.chartPalette) || value.chartPalette.length < 3 || !value.chartPalette.every((color) => typeof color === "string" && isCssColor(color))) {
    throw new HtmlPptError("THEME_CHART", "chartPalette 至少需要三个 hex 颜色", { file })
  }
  if (!Array.isArray(value.supportedLayouts)) throw new HtmlPptError("THEME_LAYOUTS", "supportedLayouts 必须是数组", { file })
  const layouts = value.supportedLayouts as unknown[]
  const missing = LAYOUTS.filter((layout) => !layouts.includes(layout))
  const unknown = layouts.filter((layout) => typeof layout !== "string" || !LAYOUTS.includes(layout as LayoutName))
  if (missing.length > 0 || unknown.length > 0) {
    throw new HtmlPptError("THEME_LAYOUTS", `布局声明不完整。缺失：${missing.join(", ") || "无"}；未知：${unknown.join(", ") || "无"}`, { file })
  }
  return raw as ThemeManifest
}

function validateCss(tokens: string, components: string, file: string): void {
  for (const token of REQUIRED_TOKEN_VARIABLES) {
    if (!tokens.includes(`${token}:`)) throw new HtmlPptError("THEME_TOKEN", `缺少 CSS token：${token}`, { file })
  }
  const combined = `${tokens}\n${components}`
  if (/@import\b/i.test(combined) || /url\(\s*["']?(?:https?:)?\/\//i.test(combined)) {
    throw new HtmlPptError("THEME_REMOTE_ASSET", "主题 CSS 禁止远程 @import 或 URL", { file })
  }
  if (/\.slide\s*\{[^}]*\b(?:width|height)\s*:/is.test(components)) {
    throw new HtmlPptError("THEME_CANVAS_OVERRIDE", "components.css 不得修改 slide 宽高", { file })
  }
  if (/\b(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\D|$)|font-size\s*:\s*0(?:\D|$))/i.test(components)) {
    throw new HtmlPptError("THEME_HIDDEN_CONTENT", "components.css 不得隐藏内容来规避布局检查", { file })
  }
}

async function validateAssetPaths(themeRoot: string, css: string): Promise<void> {
  const resources = [...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? "")
    .filter((resource) => resource !== "" && !resource.startsWith("#"))
  for (const resource of resources) {
    try {
      await resolveWorkspaceFile(themeRoot, themeRoot, resource, "THEME_ASSET_PATH")
    } catch (error) {
      if (error instanceof HtmlPptError && error.code === "RESOURCE_MISSING") {
        throw new HtmlPptError("THEME_ASSET_MISSING", `主题资产不存在：${resource}`, { file: themeRoot }, "将资产放入主题目录并使用相对路径")
      }
      throw error
    }
  }
}

async function inlineThemeAssets(themeRoot: string, css: string): Promise<string> {
  const matches = [...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi)]
    .map((match) => ({
      end: (match.index ?? 0) + match[0].length,
      resource: match[1] ?? match[2] ?? match[3] ?? "",
      start: match.index ?? 0,
    }))
    .filter(({ resource }) => resource !== "" && !resource.startsWith("#"))
  if (matches.length === 0) return css

  const replacements = await Promise.all(matches.map(async ({ resource }) => {
    const assetPath = await resolveWorkspaceFile(themeRoot, themeRoot, resource, "THEME_ASSET_PATH")
    const mime = THEME_ASSET_MIME_TYPES[path.extname(assetPath).toLowerCase()]
    if (!mime) throw new HtmlPptError("THEME_ASSET_TYPE", `主题资产类型不受支持：${resource}`, { file: assetPath })
    return `url("data:${mime};base64,${(await readFile(assetPath)).toString("base64")}")`
  }))

  let result = ""
  let cursor = 0
  matches.forEach((match, index) => {
    result += css.slice(cursor, match.start)
    result += replacements[index]
    cursor = match.end
  })
  return result + css.slice(cursor)
}

function object(value: unknown, name: string, file: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HtmlPptError("THEME_SCHEMA", `${name} 必须是对象`, { file })
  return value as Record<string, unknown>
}

function numberInRange(value: unknown, min: number, max: number, name: string, file: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new HtmlPptError("THEME_SCHEMA", `${name} 必须是 ${min}～${max} 的数字`, { file })
  }
}

function isCssColor(value: string): boolean {
  return /^#[\da-f]{6}$/i.test(value)
}
