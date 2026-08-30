import { createHash } from "node:crypto"
import { realpath, stat } from "node:fs/promises"
import path from "node:path"
import { HtmlPptError } from "./errors.js"
import type { Block, InlineContent, SourceRange } from "./types.js"

export function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

export async function resolveWorkspaceFile(
  projectRoot: string,
  baseDirectory: string,
  requestedPath: string,
  code = "RESOURCE_PATH",
): Promise<string> {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(requestedPath)) {
    throw new HtmlPptError(code, `只允许工作区内的本地相对路径：${requestedPath}`)
  }
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(requestedPath)
  } catch {
    throw new HtmlPptError(code, `资源路径包含非法转义：${requestedPath}`)
  }
  const candidate = path.resolve(baseDirectory, decodedPath)
  const rootReal = await realpath(projectRoot)
  let candidateReal: string
  try {
    candidateReal = await realpath(candidate)
  } catch {
    throw new HtmlPptError("RESOURCE_MISSING", `资源不存在：${requestedPath}`, {}, "检查相对路径和文件名")
  }
  if (!isInside(rootReal, candidateReal)) {
    throw new HtmlPptError(code, `资源路径越出项目工作区：${requestedPath}`)
  }
  const info = await stat(candidateReal)
  if (!info.isFile()) throw new HtmlPptError(code, `资源不是文件：${requestedPath}`)
  return candidateReal
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
  return slug.slice(0, 48) || "untitled"
}

export function inlineText(nodes: InlineContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text" || node.type === "inlineCode") return node.value
      if (node.type === "break") return "\n"
      if (node.type === "image") return node.alt
      return inlineText(node.children)
    })
    .join("")
}

export function blockText(block: Block): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return inlineText(block.content)
    case "list":
      return block.items.flat().map(blockText).join(" ")
    case "quote":
      return block.blocks.map(blockText).join(" ")
    case "code":
      return block.value
    case "image":
      return block.alt
    case "table":
      return block.rows.flatMap((row) => row.map((cell) => inlineText(cell))).join(" ")
    case "metric":
      return `${block.value} ${block.label}`
  }
}

export function sourceRange(node: { position?: { start: { line: number; column: number }; end: { line: number; column: number } } }): SourceRange | undefined {
  return node.position
    ? {
        start: { line: node.position.start.line, column: node.position.start.column },
        end: { line: node.position.end.line, column: node.position.end.column },
      }
    : undefined
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#96;")
}
