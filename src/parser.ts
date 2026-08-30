import { readFile } from "node:fs/promises"
import path from "node:path"
import remarkDirective from "remark-directive"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { LineCounter, parseDocument } from "yaml"
import { HtmlPptError } from "./errors.js"
import { SLIDE_KINDS, type Block, type Deck, type InlineContent, type Slide, type SlideKind } from "./types.js"
import { inlineText, slugify, sourceRange } from "./utils.js"

const MAX_SOURCE_BYTES = 500 * 1024
const MAX_NODES = 10_000
const MAX_DEPTH = 32
const SLIDE_COMMENT = /^<!--\s*slide:\s*([a-z-]+)\s*-->$/

interface MdNode {
  type: string
  value?: string
  depth?: number
  ordered?: boolean
  start?: number
  checked?: boolean | null
  lang?: string | null
  url?: string
  title?: string | null
  alt?: string
  name?: string
  attributes?: Record<string, string | null>
  children?: MdNode[]
  position?: { start: { line: number; column: number }; end: { line: number; column: number } }
}

export interface ParseOptions {
  filePath: string
  projectRoot: string
}

export async function parseMarkdownFile(filePath: string, projectRoot: string): Promise<Deck> {
  const source = await readFile(filePath, "utf8")
  return parseMarkdown(source, { filePath, projectRoot })
}

export function parseMarkdown(source: string, options: ParseOptions): Deck {
  if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) {
    throw new HtmlPptError("INPUT_TOO_LARGE", "Markdown 超过 500 KiB 限制", { file: options.filePath })
  }

  const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm).use(remarkDirective)
  const root = processor.parse(source) as MdNode
  assertTreeLimits(root, options.filePath)

  const children = root.children ?? []
  const first = children[0]
  if (!first || first.type !== "yaml") {
    throw nodeError("META_REQUIRED", "文件必须以 YAML frontmatter 开始", first, options.filePath, "添加 title、theme、ratio 和 language")
  }

  const meta = parseMeta(first.value ?? "", first, options)
  const groups: MdNode[][] = [[]]
  for (const node of children.slice(1)) {
    if (node.type === "thematicBreak") groups.push([])
    else groups.at(-1)!.push(node)
  }

  const slides = groups.map((nodes, index) => parseSlide(nodes, index, options.filePath))
  if (slides.length === 0) throw new HtmlPptError("DECK_EMPTY", "文稿至少需要一页", { file: options.filePath })

  return {
    schemaVersion: 1,
    meta: {
      ...meta,
      source: path.relative(options.projectRoot, options.filePath) || path.basename(options.filePath),
    },
    slides,
  }
}

function parseMeta(value: string, node: MdNode, options: ParseOptions): Deck["meta"] extends infer T
  ? Omit<Extract<T, object>, "source">
  : never {
  const lineCounter = new LineCounter()
  const document = parseDocument(value, { lineCounter, uniqueKeys: true })
  if (document.errors.length > 0) {
    throw nodeError("META_YAML", document.errors[0]!.message, node, options.filePath, "修正 frontmatter YAML")
  }
  const raw = document.toJS({ maxAliasCount: 0 }) as unknown
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw nodeError("META_TYPE", "frontmatter 必须是键值对象", node, options.filePath)
  }
  const record = raw as Record<string, unknown>
  const allowed = new Set(["title", "theme", "ratio", "language"])
  const unknown = Object.keys(record).filter((key) => !allowed.has(key))
  if (unknown.length > 0) {
    throw nodeError("META_UNKNOWN", `未知元数据字段：${unknown.join(", ")}`, node, options.filePath)
  }
  if (typeof record.title !== "string" || record.title.trim() === "") {
    throw nodeError("META_TITLE", "title 必须是非空字符串", node, options.filePath)
  }
  if (record.theme !== undefined && (typeof record.theme !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(record.theme))) {
    throw nodeError("META_THEME", "theme 必须是小写字母、数字和连字符组成的名称", node, options.filePath)
  }
  if (record.ratio !== undefined && record.ratio !== "16:9") {
    throw nodeError("META_RATIO", "v0.1 只支持 16:9", node, options.filePath)
  }
  if (record.language !== undefined && (typeof record.language !== "string" || record.language.trim() === "")) {
    throw nodeError("META_LANGUAGE", "language 必须是非空字符串", node, options.filePath)
  }
  return {
    title: record.title.trim(),
    theme: typeof record.theme === "string" ? record.theme : "base-light",
    ratio: "16:9",
    language: typeof record.language === "string" ? record.language : "zh-CN",
  }
}

function parseSlide(nodes: MdNode[], index: number, file: string): Slide {
  let kind: SlideKind = "content"
  const content = [...nodes]
  const first = content[0]
  if (first?.type === "html") {
    const match = SLIDE_COMMENT.exec(first.value?.trim() ?? "")
    if (!match) throw nodeError("HTML_FORBIDDEN", "只允许严格格式的 slide 类型注释", first, file)
    if (!SLIDE_KINDS.includes(match[1] as SlideKind)) {
      throw nodeError("SLIDE_KIND", `未知 slide 类型：${match[1]}`, first, file)
    }
    kind = match[1] as SlideKind
    content.shift()
  }

  if (content.length === 0) {
    throw nodeError("SLIDE_EMPTY", `第 ${index + 1} 页没有内容`, first, file, "删除空页或添加内容")
  }
  const blocks = content.map((node) => mapBlock(node, file))
  const heading = blocks.find((block) => block.type === "heading")
  const title = heading?.type === "heading" ? inlineText(heading.content) : "untitled"
  const slide: Slide = {
    id: `slide-${String(index + 1).padStart(2, "0")}-${slugify(title)}`,
    index: index + 1,
    kind,
    blocks,
  }
  const range = sourceRange(content[0]!)
  if (range) slide.source = range
  return slide
}

function mapBlock(node: MdNode, file: string): Block {
  const source = sourceRange(node)
  switch (node.type) {
    case "heading":
      return { type: "heading", level: node.depth ?? 1, content: mapInlineChildren(node, file), ...(source ? { source } : {}) }
    case "paragraph": {
      const children = node.children ?? []
      if (children.length === 1 && children[0]!.type === "image") {
        const image = children[0]!
        return {
          type: "image",
          src: validateImageUrl(image.url ?? "", image, file),
          alt: image.alt ?? "",
          ...(image.title ? { title: image.title } : {}),
          ...(source ? { source } : {}),
        }
      }
      return { type: "paragraph", content: mapInlineChildren(node, file), ...(source ? { source } : {}) }
    }
    case "list": {
      const listItems = node.children ?? []
      const items = listItems.map((item) => (item.children ?? []).map((child) => mapBlock(child, file)))
      const checked = listItems.map((item) => item.checked ?? null)
      return {
        type: "list",
        ordered: Boolean(node.ordered),
        ...(node.start !== undefined && node.start !== null ? { start: node.start } : {}),
        items,
        ...(checked.some((value) => value !== null) ? { checked } : {}),
        ...(source ? { source } : {}),
      }
    }
    case "blockquote":
      return { type: "quote", blocks: (node.children ?? []).map((child) => mapBlock(child, file)), ...(source ? { source } : {}) }
    case "code":
      return {
        type: "code",
        ...(node.lang ? { language: node.lang } : {}),
        value: node.value ?? "",
        ...(source ? { source } : {}),
      }
    case "table":
      return {
        type: "table",
        rows: (node.children ?? []).map((row) => (row.children ?? []).map((cell) => mapInlineChildren(cell, file))),
        ...(source ? { source } : {}),
      }
    case "containerDirective":
    case "leafDirective": {
      if (node.name !== "metric") {
        throw nodeError("DIRECTIVE_UNKNOWN", `未知 directive：${node.name ?? ""}`, node, file)
      }
      const attributes = node.attributes ?? {}
      const value = attributes.value
      const label = attributes.label
      if (typeof value !== "string" || value.trim() === "" || typeof label !== "string" || label.trim() === "") {
        throw nodeError("DIRECTIVE_METRIC", "metric 必须包含非空 value 和 label", node, file)
      }
      return { type: "metric", value: value.trim(), label: label.trim(), ...(source ? { source } : {}) }
    }
    case "html":
      throw nodeError("HTML_FORBIDDEN", "Markdown 原始 HTML 已禁用", node, file)
    default:
      throw nodeError("BLOCK_UNSUPPORTED", `不支持的 Markdown Block：${node.type}`, node, file)
  }
}

function mapInlineChildren(node: MdNode, file: string): InlineContent[] {
  return (node.children ?? []).map((child) => mapInline(child, file))
}

function mapInline(node: MdNode, file: string): InlineContent {
  switch (node.type) {
    case "text":
      return { type: "text", value: node.value ?? "" }
    case "inlineCode":
      return { type: "inlineCode", value: node.value ?? "" }
    case "break":
      return { type: "break" }
    case "emphasis":
    case "strong":
    case "delete":
      return { type: node.type, children: mapInlineChildren(node, file) }
    case "link": {
      const url = validateLinkUrl(node.url ?? "", node, file)
      return { type: "link", url, ...(node.title ? { title: node.title } : {}), children: mapInlineChildren(node, file) }
    }
    case "image":
      return {
        type: "image",
        src: validateImageUrl(node.url ?? "", node, file),
        alt: node.alt ?? "",
        ...(node.title ? { title: node.title } : {}),
      }
    case "html":
      throw nodeError("HTML_FORBIDDEN", "Markdown 原始 HTML 已禁用", node, file)
    default:
      throw nodeError("INLINE_UNSUPPORTED", `不支持的行内 Markdown：${node.type}`, node, file)
  }
}

function validateLinkUrl(url: string, node: MdNode, file: string): string {
  if (/^(?:javascript|data|vbscript):/i.test(url.trim())) {
    throw nodeError("LINK_UNSAFE", `不安全链接：${url}`, node, file)
  }
  return url
}

function validateImageUrl(url: string, node: MdNode, file: string): string {
  if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(url)) {
    throw nodeError("IMAGE_LOCAL_ONLY", `图片必须使用工作区内的相对路径：${url}`, node, file)
  }
  return url
}

function assertTreeLimits(root: MdNode, file: string): void {
  let count = 0
  const visit = (node: MdNode, depth: number): void => {
    count += 1
    if (count > MAX_NODES) throw new HtmlPptError("INPUT_NODE_LIMIT", `Markdown AST 超过 ${MAX_NODES} 个节点`, { file })
    if (depth > MAX_DEPTH) throw new HtmlPptError("INPUT_DEPTH_LIMIT", `Markdown AST 超过 ${MAX_DEPTH} 层`, { file })
    for (const child of node.children ?? []) visit(child, depth + 1)
  }
  visit(root, 0)
}

function nodeError(code: string, message: string, node: MdNode | undefined, file: string, hint?: string): HtmlPptError {
  return new HtmlPptError(
    code,
    message,
    {
      file,
      ...(node?.position ? { line: node.position.start.line, column: node.position.start.column } : {}),
    },
    hint,
  )
}
