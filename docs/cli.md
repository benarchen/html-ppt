# CLI 参考

## 通用约束

- 从项目根目录执行。
- 输入文件必须位于项目工作区内。
- 输出目录必须位于项目工作区内且不能预先存在。
- 主题名称只能包含小写字母、数字和连字符。
- 浏览器命令需要项目内 Chromium。
- `build`、`preview`、`export` 和 `check` 支持 `--log-level quiet|normal|verbose`，默认 `normal`。

## `build`

```bash
npm run html-ppt -- build <deck.md> [--theme <name>] [--output <dir>] \
  [--log-level quiet|normal|verbose]
```

生成 `index.html`、原始 Deck IR、Planned Deck IR 和构建元数据。只构建，不启动浏览器。

## `preview`

```bash
npm run html-ppt -- preview <deck.md> [--theme <name>] [--port <number>] \
  [--log-level quiet|normal|verbose]
```

在 `127.0.0.1` 启动本地预览。默认端口为 `4173`，监听 Markdown 和当前主题变化并自动重建。`Ctrl+C` 停止。

## `export`

```bash
PLAYWRIGHT_BROWSERS_PATH=0 npm run html-ppt -- export <deck.md> \
  [--theme <name>] [--format pdf|png|pptx-flat|all] [--output <dir>] \
  [--log-level quiet|normal|verbose]
```

先构建并执行 Preflight，再按格式导出派生产物。`pdf` 只生成 PDF；`png` 生成逐页 PNG 和 `contact-sheet.html`；`pptx-flat` 在保留同一组 PNG 的同时将其逐页封装为不可编辑的 `deck.pptx`；`all` 同时生成 PDF、PNG 和 PPTX。未提供 `--format` 时等价于 `all`。主题包含 `style-spec.json` 时，还会生成集中展示参考图、Style Spec、Manifest、token 和全部页面的 `theme-review.html`。

PPTX 固定为 16∶9，每页只有一张由最终 HTML 导出的 `2560 × 1440` PNG。它不会重新排版，也不保留 HTML 动画和交互；`delivery.json` 会记录 `pptxMode: "flat"` 与 `pptxEditable: false`。

导出过程使用 `<output>.partial-<pid>-<timestamp>` 工作目录。工具会核对 HTML、PDF、PNG 与 PPTX 页数，并校验 PNG 尺寸；只有 Preflight 与全部导出步骤成功后，工作目录才会写入 `delivery.json` 并原子重命名为目标目录。失败时不会出现目标目录，残留的 `.partial-*` 目录也不具备完成标记，不能当作交付物。

## `check`

```bash
PLAYWRIGHT_BROWSERS_PATH=0 npm run html-ppt -- check <deck.md> \
  [--theme <name>] [--strict] [--output <dir>] \
  [--log-level quiet|normal|verbose]
```

生成 HTML 与 `report.json`。普通模式下 `WARN` 不阻断，`--strict` 会把 `WARN` 升级为 `ERROR`。

## `inspect-ir`

```bash
npm run html-ppt -- inspect-ir <deck.md>
```

将 Deck IR JSON 输出到标准输出，不写构建目录。

## `check-themes`

```bash
npm run check:themes
```

校验所有正式主题的 Manifest、token、CSS 安全边界和 specimen。每个 specimen 必须覆盖全部 12 种标准布局。

## 退出码

| 退出码 | 含义 |
|---:|---|
| `0` | 命令完成，所有阻断性检查通过 |
| `1` | 输入、主题、构建、浏览器、Preflight 或导出失败 |
| `2` | CLI 命令或参数错误 |

错误格式包含规则 id、文件／源位置和可用的修复提示。

## 日志级别

- `quiet`：成功时不输出普通进度；错误仍写入标准错误。
- `normal`：输出完成位置和 Preflight 摘要。
- `verbose`：在普通输出之外记录 build id、主题和页数。

`ERROR` 会阻断并返回非零退出码；`WARN` 默认不阻断，在 `--strict` 下升级为 `ERROR`；`INFO` 仅记录上下文，不阻断。
