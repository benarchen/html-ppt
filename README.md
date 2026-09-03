# html-ppt

一个以 Markdown 为内容入口、以结构化 Deck IR 为核心、以 HTML 为唯一视觉真相源的多风格演示文稿生成器。

公开仓库：https://github.com/benarchen/html-ppt

当前开发候选版本：`v0.4.0`；最近公开基线版本：`v0.3.0`。

## 当前能力

- 解析 YAML frontmatter、分页、GFM 表格／任务列表、代码、图片和 `metric` directive。
- 生成稳定的 Deck IR 和 Planned Deck IR。
- 提供 `base-light`、`editorial-dark` 与 `cosmic-mint` 三套主题。
- 支持 12 种标准布局与确定性内容拆页。
- 生成可离线打开的静态 HTML。
- 默认 HTML 以逐页演示模式打开，支持键盘、滚轮／触控板和 URL hash 深链接。
- 提供本地预览与源文件／主题热重载。
- 通过 Chromium 执行 Preflight、PDF 与逐页 PNG 导出，并将同一组 PNG 封装为高保真图片型 PPTX。
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

导出 HTML、PDF、PNG、图片型 PPTX 和 contact sheet：

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

只生成图片型 PPTX 时使用 `--format pptx-flat`。该模式仍保留 `slides/`，因为 PPTX 的每一页都直接嵌入对应 PNG；页面视觉与 HTML 一致，但文字、图表和形状不可编辑。

## 演示播放

直接打开生成目录中的 `index.html` 即进入逐页演示模式，同一时刻只显示一页，页面不会形成连续纵向长文档。16∶9 视口会贴合四边，超宽或 4∶3 视口使用当前主题的舞台背景承接剩余区域，逻辑画布始终保持 1280 × 720，不拉伸、不裁切。

- 下一页：`ArrowRight`、`ArrowDown`、`PageDown`、`Space`、向下或向右滚动。
- 上一页：`ArrowLeft`、`ArrowUp`、`PageUp`、`Shift+Space`、向上或向左滚动。
- 首尾页：`Home`、`End`。
- 触控：在主要方向滑动至少 60px。
- 深链接：当前页面写入 URL hash，例如 `#slide-04`；合法 hash 会在刷新后恢复，无效 hash 回退到第一页。

系统启用“减少动态效果”时，页面立即切换，主题背景动画冻结。`?mode=render` 是 Preflight、PDF、PNG 和自动化测试使用的全页渲染入口，不作为日常播放方式。

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
  deck.pptx
  contact-sheet.html
  theme-review.html  # 仅参考图主题
  slides/
    slide-01.png
    ...
```

`build.json` 记录引擎、Node.js、字体族和实际 Chromium 版本；`report.json` 记录 Preflight 运行时及问题；只有 `delivery.json` 的 `status` 为 `complete` 时，目录才是完整导出。

## 主题

同一份 Markdown 可以通过 `--theme` 切换主题，无需修改内容。新主题从 `themes/_template/` 开始，先完成 Style Spec，再实现 token、组件和全部布局 specimen。

`cosmic-mint` 是首套由用户参考图提取并完成验收的正式主题，当前版本为 `0.1.5`。它使用铺满演示舞台的颗粒化斜向银河、15 颗独立闪光并小范围漂移的圆点主星、右侧缓慢转动的陆地点阵地球，以及每波随机出现 1～3 颗、从左边缘进入并沿上半区从上边缘离开的流星构成背景；海洋区域不铺点阵，打印、全页渲染与减少动态效果环境不会启动随机流星调度。参考原图仅限本地分析且不会进入公开仓库；主题包只保留脱敏的 Style Spec、可复用 token、CSS 设计规则和代码生成的 SVG 资产。

```bash
npm run html-ppt -- build themes/cosmic-mint/specimen.md \
  --theme cosmic-mint \
  --output output/cosmic-mint-specimen
```

Goal 002 还使用一份仅限本地处理的真实 Markdown 验证了 27 页双主题构建、严格 Preflight 和全格式导出。该输入及其派生演示稿位于被 Git 忽略的 `inputs-private/`，不属于公开示例。

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

- 当前只支持固定 16∶9 画布。
- 不提供可视化拖拽编辑器、在线服务和多人协作。
- 不执行 Markdown 原始 HTML、脚本或远程图片。
- `pptx-flat` 只提供高保真图片页，不支持编辑页面内的文字、图表或形状，也不保留 HTML 动画与交互。
- 不支持任意 HTML 到可编辑 PPTX 的无损转换；`pptx-editable` 仍是未实现、未承诺的独立后续能力。

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
- [Goal 002 交付报告](docs/delivery-goal-002.md)
- [Goal 003 交付报告](docs/delivery-goal-003.md)
- [Goal 004 交付报告](docs/delivery-goal-004.md)
- [施工 Goal](goals/001-v0.1-mvp.md)
- [Goal 002 施工清单](goals/002-reference-theme-real-deck.md)
- [Goal 003 施工清单](goals/003-presentation-player-and-cosmic-motion.md)
- [Goal 004 施工清单](goals/004-pptx-flat-export.md)
- [项目路线图](ROADMAP.md)
