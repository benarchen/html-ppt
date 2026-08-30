export const SLIDE_KINDS = [
  "cover",
  "section",
  "content",
  "metrics",
  "comparison",
  "timeline",
  "quote",
  "image",
  "chart",
  "full-bleed-image",
  "ending",
] as const

export type SlideKind = (typeof SLIDE_KINDS)[number]

export const LAYOUTS = [
  "cover",
  "section",
  "title-body",
  "two-column",
  "image-text",
  "metrics",
  "comparison",
  "timeline",
  "quote",
  "chart",
  "full-bleed-image",
  "ending",
] as const

export type LayoutName = (typeof LAYOUTS)[number]

export interface SourcePoint {
  line: number
  column: number
}

export interface SourceRange {
  start: SourcePoint
  end: SourcePoint
}

export type InlineContent =
  | { type: "text"; value: string }
  | { type: "inlineCode"; value: string }
  | { type: "break" }
  | { type: "emphasis" | "strong" | "delete"; children: InlineContent[] }
  | { type: "link"; url: string; title?: string; children: InlineContent[] }
  | { type: "image"; src: string; alt: string; title?: string }

interface BaseBlock {
  source?: SourceRange
}

export type Block =
  | (BaseBlock & { type: "heading"; level: number; content: InlineContent[] })
  | (BaseBlock & { type: "paragraph"; content: InlineContent[] })
  | (BaseBlock & { type: "list"; ordered: boolean; start?: number; items: Block[][]; checked?: Array<boolean | null> })
  | (BaseBlock & { type: "quote"; blocks: Block[] })
  | (BaseBlock & { type: "code"; language?: string; value: string })
  | (BaseBlock & { type: "image"; src: string; alt: string; title?: string })
  | (BaseBlock & { type: "table"; rows: InlineContent[][][] })
  | (BaseBlock & { type: "metric"; value: string; label: string })

export interface Slide {
  id: string
  index: number
  kind: SlideKind
  blocks: Block[]
  source?: SourceRange
}

export interface Deck {
  schemaVersion: 1
  meta: {
    title: string
    theme: string
    ratio: "16:9"
    language: string
    source: string
  }
  slides: Slide[]
}

export interface PlannedSlide extends Slide {
  layout: LayoutName
}

export interface PlannedDeck extends Omit<Deck, "slides"> {
  slides: PlannedSlide[]
}

export interface ThemeManifest {
  name: string
  version: string
  schemaVersion: 1
  engine: string
  canvas: {
    ratio: "16:9"
    width: 1280
    height: 720
    safeArea: number
    grid: { columns: 12; gap: number }
  }
  typography: {
    display: { family: string; minSize: number }
    heading: { family: string; minSize: number }
    body: { family: string; minSize: number }
    caption: { family: string; minSize: number }
  }
  colors: {
    background: string
    surface: string
    text: string
    muted: string
    accent: string
    accentAlt: string
    border: string
  }
  spacing: { unit: number }
  radii: { small: number; large: number }
  shadows: { card: string }
  imageTreatment: { radius: number; filter: string }
  chartPalette: string[]
  supportedLayouts: LayoutName[]
}

export interface ThemePackage {
  root: string
  manifest: ThemeManifest
  tokensCss: string
  componentsCss: string
}

export interface Issue {
  ruleId: string
  severity: "ERROR" | "WARN" | "INFO"
  message: string
  slideId?: string
  slideIndex?: number
  sourceLine?: number
  hint?: string
}

export interface PreflightReport {
  schemaVersion: 1
  html: string
  slideCount: number
  generatedAt: string
  errors: number
  warnings: number
  issues: Issue[]
  runtime: {
    browserVersion: string
    userAgent: string
    fontFamilies: string[]
  }
}
