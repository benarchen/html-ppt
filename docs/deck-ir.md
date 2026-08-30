# Deck IR 规范

## 目标

Deck IR 是 Markdown、主题、布局和导出之间的稳定语义边界。它不包含 CSS、绝对坐标或主题专属字段。

## 版本

v0.1 使用 `schemaVersion: 1`。不认识的主版本必须拒绝；新增可选字段可以保持向后兼容。

## 顶层结构

```ts
interface Deck {
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
```

`Slide` 包含稳定 `id`、`index`、`kind`、可选 `layoutHint`、`blocks` 和源位置。ID 由页序与标题 slug 确定，相同输入必须生成相同 ID。

## Block

v0.1 定义以下 Block：

- `heading`：层级与富文本内容。
- `paragraph`：富文本内容。
- `list`：有序标记、递归列表项，以及任务列表可选的逐项 `checked` 状态。
- `quote`：递归 Block。
- `code`：语言和原始代码。
- `image`：工作区内本地资源、替代文字和可选标题。
- `table`：表头与数据行。
- `metric`：值与标签。

富文本节点支持 `text`、`emphasis`、`strong`、`delete`、`inlineCode`、`link` 和 `break`。链接只允许明确的安全协议或相对锚点。

## 不变量

- Deck 至少包含一页。
- 每页至少包含一个有效内容 Block。
- 所有 `id` 唯一且稳定。
- `kind` 和 Block 类型必须属于 Schema 已知枚举。
- IR 不携带可执行脚本、任意 HTML、CSS 或主题实现细节。
- IR JSON 使用稳定字段顺序和两个空格缩进，便于调试与快照测试。
