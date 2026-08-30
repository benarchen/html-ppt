# Markdown 输入规范

## 文档元数据

文件必须以 YAML frontmatter 开始：

```yaml
---
title: 示例演示
theme: base-light
ratio: 16:9
language: zh-CN
---
```

- `title`：必填非空字符串。
- `theme`：可选，默认 `base-light`。
- `ratio`：可选，但 v0.1 只接受 `16:9`。
- `language`：可选，默认 `zh-CN`。

未知元数据字段在 v0.1 中报错，避免拼写错误被静默忽略。

## 分页

frontmatter 结束后的顶层 `---` 是幻灯片分隔符。空页面报错。代码块、引用或其他嵌套结构中的 `---` 不分页。

## 页面类型

每页第一项可以使用严格格式的注释声明页面类型：

```md
<!-- slide: metrics -->
```

允许值为 `cover`、`section`、`content`、`metrics`、`comparison`、`timeline`、`quote`、`image`、`chart`、`full-bleed-image` 和 `ending`。省略时默认为 `content`。

除上述 slide 注释外，v0.1 拒绝其他原始 HTML。

## 内容语法

v0.1 支持：

- 一级至六级标题。
- 段落、强调、加粗、删除线、行内代码和安全链接。
- 有序、无序和 GFM 任务列表；任务列表在 Deck IR 中保留逐项勾选状态。
- 引用。
- 带可选语言标识的代码块。
- 本地图片。
- GFM 表格。
- `metric` directive。

指标语法：

```md
:::metric{value="42%" label="交付效率提升"}
:::
```

`metric` 必须同时包含非空 `value` 和 `label`。未知 directive 报错。

## 资源与安全

- 图片只允许相对 Markdown 文件的本地路径。
- 禁止 `http:`、`https:`、`javascript:`、`data:` 和协议相对 URL。
- 本地资源解析后的真实路径必须位于项目工作区内。
- 不执行脚本、事件属性和 Markdown 中的原始 HTML。
- 输入上限为 500 KiB、10,000 个 AST 节点和 32 层嵌套。

## 错误

错误必须包含稳定规则 id、文件名、源位置和修复提示。解析或校验失败时返回非零退出码，不生成可交付产物。
