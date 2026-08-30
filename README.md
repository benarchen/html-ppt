# html-ppt

一个以 Markdown 为内容入口、以结构化 Deck IR 为核心、以 HTML 为唯一视觉真相源的多风格演示文稿生成器。

## 当前能力

- 解析 YAML frontmatter、分页、GFM 表格／任务列表、代码、图片和 `metric` directive。
- 生成稳定的 Deck IR 和 Planned Deck IR。
- 提供 `base-light` 与 `editorial-dark` 两套主题。
- 支持 12 种标准布局与确定性内容拆页。
- 生成可离线打开的静态 HTML。
- 提供本地预览与源文件／主题热重载。
- 通过 Chromium 执行 Preflight、PDF 与逐页 PNG 导出。
- 输出机器可读检查报告和 PNG contact sheet。
- 提供单元、契约、集成、浏览器和视觉回归测试。

## 环境要求

- Node.js 24 LTS，或项目当前支持的 Node.js 26。
- npm。
- macOS、Linux 或 Windows 上受 Playwright 支持的 Chromium 环境。

## 安装

```bash
npm install
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
npm run build
```

浏览器使用项目内安装路径，不需要全局安装 Chromium。

## 快速开始

构建 HTML：

```bash
npm run html-ppt -- build examples/specimen.md \
  --theme base-light \
  --output output/my-deck-html
```

预览并监听变化：

```bash
npm run html-ppt -- preview examples/specimen.md \
  --theme editorial-dark \
  --port 4173
```

导出 HTML、PDF、PNG 和 contact sheet：

```bash
PLAYWRIGHT_BROWSERS_PATH=0 npm run html-ppt -- export examples/specimen.md \
  --theme base-light \
  --format all \
  --output output/my-deck-export
```

严格检查：

```bash
PLAYWRIGHT_BROWSERS_PATH=0 npm run html-ppt -- check examples/specimen.md \
  --theme base-light \
  --strict \
  --output output/my-deck-check
```

输出目录不能预先存在，工具不会覆盖已有产物。`export` 先写入带 `.partial-*` 标识的工作目录，全部步骤成功后才原子重命名，并写入 `delivery.json` 完成标记。

## 输出结构

```text
output/my-deck-export/
  index.html
  deck.ir.json
  deck.planned.json
  build.json
  report.json
  delivery.json
  deck.pdf
  contact-sheet.html
  theme-review.html  # 仅参考图主题
  slides/
    slide-01.png
    ...
```

`build.json` 记录引擎、Node.js、字体族和实际 Chromium 版本；`report.json` 记录 Preflight 运行时及问题；只有 `delivery.json` 的 `status` 为 `complete` 时，目录才是完整导出。

## 主题

同一份 Markdown 可以通过 `--theme` 切换主题，无需修改内容。新主题从 `themes/_template/` 开始，先完成 Style Spec，再实现 token、组件和全部布局 specimen。

```bash
npm run check:themes
```

## 测试

```bash
npm run typecheck
npm test
npm run test:browser
npm run test:visual
```

`test:browser` 和 `test:visual` 会启动项目内 Chromium。在受限沙箱中运行时，需要允许本地浏览器进程和回环端口。

## 当前限制

- v0.1 只支持固定 16∶9 画布。
- 不提供可视化拖拽编辑器、在线服务和多人协作。
- 不执行 Markdown 原始 HTML、脚本或远程图片。
- 不支持任意 HTML 到可编辑 PPTX 的无损转换。
- `pptx-flat` 和 `pptx-editable` 均未包含在 v0.1。

## 文档

- [项目架构](docs/architecture.md)
- [Markdown 规范](docs/markdown-spec.md)
- [Deck IR 规范](docs/deck-ir.md)
- [主题规范](docs/theme-spec.md)
- [风格提取规范](docs/style-extraction.md)
- [CLI 参考](docs/cli.md)
- [测试说明](docs/testing.md)
- [依赖说明](docs/dependencies.md)
- [v0.1 交付报告](docs/delivery-v0.1.md)
- [施工 Goal](goals/001-v0.1-mvp.md)
- [项目路线图](ROADMAP.md)
