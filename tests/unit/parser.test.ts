import assert from "node:assert/strict"
import test from "node:test"
import path from "node:path"
import { HtmlPptError } from "../../src/errors.js"
import { parseMarkdown } from "../../src/parser.js"

const root = process.cwd()
const filePath = path.join(root, "tests", "fixture.md")

function parse(source: string) {
  return parseMarkdown(source, { filePath, projectRoot: root })
}

function expectsCode(code: string): (error: unknown) => boolean {
  return (error) => error instanceof HtmlPptError && error.code === code
}

test("解析 frontmatter、分页、GFM 和 metric", () => {
  const source = `---
title: 测试
theme: base-light
ratio: 16:9
language: zh-CN
---

<!-- slide: cover -->

# 标题

正文

---

<!-- slide: metrics -->

# 指标

:::metric{value="42%" label="提升"}
:::
`
  const deck = parse(source)
  assert.equal(deck.slides.length, 2)
  assert.equal(deck.slides[0]!.kind, "cover")
  assert.equal(deck.slides[1]!.blocks[1]!.type, "metric")
  assert.equal(deck.slides[0]!.id, "slide-01-标题")
})

test("保留 GFM 表格、任务状态和代码块语义", () => {
  const deck = parse(`---
title: GFM
---
# GFM

- [x] 已完成
- [ ] 未完成

| 项目 | 状态 |
| --- | --- |
| A | OK |

\`\`\`ts
const ready = true
\`\`\`
`)
  const list = deck.slides[0]!.blocks.find((block) => block.type === "list")
  const table = deck.slides[0]!.blocks.find((block) => block.type === "table")
  const code = deck.slides[0]!.blocks.find((block) => block.type === "code")
  assert.deepEqual(list?.type === "list" ? list.checked : undefined, [true, false])
  assert.equal(table?.type === "table" ? table.rows.length : 0, 2)
  assert.equal(code?.type === "code" ? code.language : undefined, "ts")
})

test("相同输入生成稳定 IR", () => {
  const source = `---\ntitle: 稳定\n---\n\n# 稳定标题\n\n正文\n`
  assert.deepEqual(parse(source), parse(source))
})

test("拒绝缺失元数据、未知字段与非法比例", () => {
  assert.throws(() => parse("# no meta"), expectsCode("META_REQUIRED"))
  assert.throws(() => parse("---\ntitle: x\nunknown: true\n---\n# x"), expectsCode("META_UNKNOWN"))
  assert.throws(() => parse("---\ntitle: x\nratio: 4:3\n---\n# x"), expectsCode("META_RATIO"))
})

test("拒绝重复字段、错误类型和无有效页面输入", () => {
  assert.throws(() => parse(""), expectsCode("META_REQUIRED"))
  assert.throws(() => parse("---\ntitle: x\ntitle: y\n---\n# x"), expectsCode("META_YAML"))
  assert.throws(() => parse("---\ntitle: 42\n---\n# x"), expectsCode("META_TITLE"))
  assert.throws(() => parse("---\ntitle: x\n---\n"), expectsCode("SLIDE_EMPTY"))
})

test("拒绝原始 HTML、危险链接、远程和绝对图片", () => {
  assert.throws(() => parse("---\ntitle: x\n---\n# x\n\n<script>alert(1)</script>"), expectsCode("HTML_FORBIDDEN"))
  assert.throws(() => parse("---\ntitle: x\n---\n# x\n\n[bad](javascript:alert(1))"), expectsCode("LINK_UNSAFE"))
  assert.throws(() => parse("---\ntitle: x\n---\n# x\n\n![x](https://example.com/x.png)"), expectsCode("IMAGE_LOCAL_ONLY"))
  assert.throws(() => parse("---\ntitle: x\n---\n# x\n\n![x](/tmp/x.png)"), expectsCode("IMAGE_LOCAL_ONLY"))
})

test("拒绝空页面、未知页面类型和未知 directive", () => {
  assert.throws(() => parse("---\ntitle: x\n---\n# x\n\n---\n"), expectsCode("SLIDE_EMPTY"))
  assert.throws(() => parse("---\ntitle: x\n---\n<!-- slide: magic -->\n# x"), expectsCode("SLIDE_KIND"))
  assert.throws(() => parse("---\ntitle: x\n---\n# x\n\n:::unknown\n:::\n"), expectsCode("DIRECTIVE_UNKNOWN"))
})

test("拒绝超过 500 KiB 的输入", () => {
  const source = `---\ntitle: x\n---\n# x\n${"a".repeat(501 * 1024)}`
  assert.throws(() => parse(source), expectsCode("INPUT_TOO_LARGE"))
})

test("拒绝超过 AST 深度和节点数量限制的输入", () => {
  assert.throws(() => parse(`---\ntitle: x\n---\n${"> ".repeat(40)}deep`), expectsCode("INPUT_DEPTH_LIMIT"))
  assert.throws(() => parse(`---\ntitle: x\n---\n# x\n\n${"**a** ".repeat(6000)}`), expectsCode("INPUT_NODE_LIMIT"))
})
