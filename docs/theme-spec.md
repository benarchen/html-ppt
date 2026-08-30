# Theme Package 规范

## 目录契约

```text
themes/<name>/
  theme.json
  tokens.css
  components.css
  specimen.md
  assets/
  references/
```

`assets/` 和 `references/` 没有内容时可以暂不创建。

## Manifest

`theme.json` 必须包含：

- `name`：与目录名一致。
- `schemaVersion`：v0.1 固定为 `1`。
- `engine`：兼容的引擎主版本。
- `canvas`：固定 `16:9`、`1280 × 720`、safe area 和 12 栏栅格。
- `typography`：display、heading、body、caption 字体和最小字号。
- `colors`：background、surface、text、muted、accent、accentAlt、border。
- `spacing`、`radii`、`shadows`、`imageTreatment` 和 `chartPalette`。
- `supportedLayouts`：主题明确支持的布局集合。

## CSS 契约

`tokens.css` 只声明 `--hp-*` CSS 自定义属性。`components.css` 可以设置主题视觉，但不得：

- 隐藏内容以规避溢出。
- 将正文缩小到 Manifest 最小字号以下。
- 修改固定画布尺寸。
- 注入远程字体、图片或脚本。
- 使用主题目录以外的未声明资源。

CSS 中的本地 `url(...)` 会解析真实路径；资源必须存在、必须是文件，且符号链接解析后仍须位于当前主题目录。远程协议、`data:`、绝对路径和越界相对路径均拒绝。

## 布局能力

v0.1 标准布局为 `cover`、`section`、`title-body`、`two-column`、`image-text`、`metrics`、`comparison`、`timeline`、`quote`、`chart`、`full-bleed-image` 和 `ending`。主题缺失任一标准布局时契约检查失败。

## 验收

每个主题必须使用 specimen 渲染全部标准布局，并通过 Manifest、资源、Preflight 和视觉回归检查。同一 Deck IR 切换主题时不得改变内容顺序和页数。

参考图主题还必须包含 `style-spec.json` 与可追溯的 `references/` 资源。PNG 导出时生成的 `theme-review.html` 是主题审核入口。
