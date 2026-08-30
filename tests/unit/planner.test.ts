import assert from "node:assert/strict"
import test from "node:test"
import path from "node:path"
import { HtmlPptError } from "../../src/errors.js"
import { parseMarkdown } from "../../src/parser.js"
import { planDeck } from "../../src/planner.js"

const root = process.cwd()

function plan(body: string) {
  const deck = parseMarkdown(`---\ntitle: test\n---\n${body}`, { filePath: path.join(root, "tests", "planner.md"), projectRoot: root })
  return planDeck(deck)
}

test("根据内容推断 title-body、two-column 和 image-text", () => {
  assert.equal(plan("# A\n\nBody").slides[0]!.layout, "title-body")
  assert.equal(plan("# A\n\n## L\n\nLeft\n\n## R\n\nRight").slides[0]!.layout, "two-column")
  assert.equal(plan("# A\n\n![x](../examples/assets/sample.svg)").slides[0]!.layout, "image-text")
})

test("超过六项的列表确定性拆页", () => {
  const deck = plan("# A\n\n- 1\n- 2\n- 3\n- 4\n- 5\n- 6\n- 7\n- 8")
  assert.equal(deck.slides.length, 2)
  assert.equal(deck.slides[0]!.id.endsWith("-1"), true)
  assert.equal(deck.slides[1]!.id.endsWith("-2"), true)
})

test("特殊布局执行内容预算", () => {
  assert.throws(
    () => plan("<!-- slide: metrics -->\n# M"),
    (error) => error instanceof HtmlPptError && error.code === "LAYOUT_METRICS",
  )
  assert.throws(
    () => plan(`<!-- slide: content -->\n# ${"a".repeat(81)}`),
    (error) => error instanceof HtmlPptError && error.code === "TITLE_TOO_LONG",
  )
})

test("显式页面类型确定性映射全部特殊布局", () => {
  const cases = [
    ["cover", "# Cover"],
    ["section", "# Section"],
    ["metrics", "# Metrics\n\n:::metric{value=\"1\" label=\"A\"}\n:::"],
    ["comparison", "# Compare\n\n## A\n\nLeft\n\n## B\n\nRight"],
    ["timeline", "# Timeline\n\n- A\n- B"],
    ["quote", "# Quote\n\n> Words"],
    ["chart", "# Chart\n\n| A | B |\n| --- | ---: |\n| X | 1 |"],
    ["full-bleed-image", "# Image\n\n![x](../examples/assets/sample.svg)"],
    ["ending", "# End"],
  ] as const
  for (const [kind, content] of cases) {
    assert.equal(plan(`<!-- slide: ${kind} -->\n${content}`).slides[0]!.layout, kind)
  }
})
