export interface SourceLocation {
  file?: string
  line?: number
  column?: number
  slideId?: string
}

export class HtmlPptError extends Error {
  readonly code: string
  readonly location: SourceLocation
  readonly hint?: string

  constructor(code: string, message: string, location: SourceLocation = {}, hint?: string) {
    super(message)
    this.name = "HtmlPptError"
    this.code = code
    this.location = location
    if (hint !== undefined) this.hint = hint
  }
}

export function formatError(error: unknown): string {
  if (!(error instanceof HtmlPptError)) {
    return `ERROR INTERNAL ${error instanceof Error ? error.message : String(error)}`
  }

  const parts = [error.location.file, error.location.line, error.location.column]
  const source = parts[0]
    ? `${parts[0]}${parts[1] ? `:${parts[1]}` : ""}${parts[2] ? `:${parts[2]}` : ""}`
    : ""
  const slide = error.location.slideId ? ` [${error.location.slideId}]` : ""
  const hint = error.hint ? `\n  修复：${error.hint}` : ""
  return `ERROR ${error.code}${source ? ` ${source}` : ""}${slide} ${error.message}${hint}`
}
