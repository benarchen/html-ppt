import { HtmlPptError } from "./errors.js"
import type { Block, Deck, LayoutName, PlannedDeck, PlannedSlide, Slide } from "./types.js"
import { blockText, inlineText } from "./utils.js"

const KIND_LAYOUT: Record<Exclude<Slide["kind"], "content" | "image">, LayoutName> = {
  cover: "cover",
  section: "section",
  metrics: "metrics",
  comparison: "comparison",
  timeline: "timeline",
  quote: "quote",
  chart: "chart",
  "full-bleed-image": "full-bleed-image",
  ending: "ending",
}

export function planDeck(deck: Deck): PlannedDeck {
  const slides: PlannedSlide[] = []
  for (const slide of deck.slides) {
    for (const planned of planSlide(slide)) slides.push({ ...planned, index: slides.length + 1 })
  }
  return { ...deck, slides }
}

function planSlide(slide: Slide): PlannedSlide[] {
  const title = slide.blocks.find((block) => block.type === "heading" && block.level === 1)
  if (title?.type === "heading" && inlineText(title.content).length > 80) {
    throw new HtmlPptError(
      "TITLE_TOO_LONG",
      "标题超过 80 个字符",
      { slideId: slide.id, ...(title.source ? { line: title.source.start.line } : {}) },
      "缩短标题",
    )
  }

  if (slide.kind === "content") {
    const layout = inferContentLayout(slide.blocks)
    return splitIfNeeded(slide, layout)
  }
  if (slide.kind === "image") return splitIfNeeded(slide, "image-text")
  const layout = KIND_LAYOUT[slide.kind]
  validateSpecialLayout(slide, layout)
  return [{ ...slide, layout }]
}

function inferContentLayout(blocks: Block[]): LayoutName {
  if (blocks.some((block) => block.type === "image")) return "image-text"
  if (blocks.filter((block) => block.type === "heading" && block.level === 2).length === 2) return "two-column"
  return "title-body"
}

function splitIfNeeded(slide: Slide, layout: LayoutName): PlannedSlide[] {
  const title = slide.blocks.find((block) => block.type === "heading" && block.level === 1)
  const body = slide.blocks.filter((block) => block !== title)
  const list = body.find((block) => block.type === "list")
  if (body.length <= 7 && (!list || list.type !== "list" || list.items.length <= 6) && body.map(blockText).join(" ").length <= 700) {
    return [{ ...slide, layout }]
  }

  let chunks: Block[][]
  if (list?.type === "list" && list.items.length > 6) {
    const listIndex = body.indexOf(list)
    const prefix = body.slice(0, listIndex)
    const suffix = body.slice(listIndex + 1)
    chunks = []
    for (let index = 0; index < list.items.length; index += 6) {
      chunks.push([
        ...(index === 0 ? prefix : []),
        {
          ...list,
          items: list.items.slice(index, index + 6),
          ...(list.checked ? { checked: list.checked.slice(index, index + 6) } : {}),
        },
        ...(index + 6 >= list.items.length ? suffix : []),
      ])
    }
  } else {
    chunks = []
    for (let index = 0; index < body.length; index += 6) chunks.push(body.slice(index, index + 6))
  }
  if (chunks.length <= 1) {
    throw new HtmlPptError("LAYOUT_BUDGET", "页面内容超过布局预算且无法安全拆页", { slideId: slide.id }, "减少内容或显式拆页")
  }
  return chunks.map((chunk, index) => ({
    ...slide,
    id: `${slide.id}-${index + 1}`,
    blocks: [...(title ? [title] : []), ...chunk],
    layout,
  }))
}

function validateSpecialLayout(slide: Slide, layout: LayoutName): void {
  const count = (type: Block["type"]) => slide.blocks.filter((block) => block.type === type).length
  if (layout === "metrics" && (count("metric") < 1 || count("metric") > 4)) {
    throw new HtmlPptError("LAYOUT_METRICS", "metrics 页面需要 1～4 个 metric", { slideId: slide.id })
  }
  if ((layout === "image-text" || layout === "full-bleed-image") && count("image") !== 1) {
    throw new HtmlPptError("LAYOUT_IMAGE", `${layout} 页面必须包含且只包含一张块级图片`, { slideId: slide.id })
  }
  if (layout === "comparison" && count("heading") < 3) {
    throw new HtmlPptError("LAYOUT_COMPARISON", "comparison 页面需要一个主标题和两个二级标题", { slideId: slide.id })
  }
  if (layout === "timeline") {
    const list = slide.blocks.find((block) => block.type === "list")
    if (!list || list.type !== "list" || list.items.length < 2 || list.items.length > 6) {
      throw new HtmlPptError("LAYOUT_TIMELINE", "timeline 页面需要包含 2～6 项的列表", { slideId: slide.id })
    }
  }
  if (layout === "chart" && count("table") !== 1) {
    throw new HtmlPptError("LAYOUT_CHART", "chart 页面需要且只需要一个表格", { slideId: slide.id })
  }
}
