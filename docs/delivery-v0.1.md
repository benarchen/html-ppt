# html-ppt v0.1 交付报告

## 交付信息

- 版本：`0.1.0`。
- 交付日期：2026-08-30。
- 生产兼容基线：Node.js 24 LTS。
- 本地验证环境：Node.js 26.0.0、npm 11.12.1、Playwright 1.62.1、Chromium 151.0.7922.34。
- Git 基线：提交 `ef98318`，注解标签 `v0.1.0`；标签已推送至公开仓库 https://github.com/benarchen/html-ppt 。

## 已实现能力

- Markdown frontmatter、分页、GFM、图片和 `metric` directive 解析。
- 带版本、源位置和稳定 slide id 的 Deck IR。
- 确定性布局推断、内容预算和长列表拆页。
- `base-light`、`editorial-dark` 两套主题及统一 Theme Contract。
- 12 种标准布局。
- 固定 `1280 × 720`、可离线打开的静态 HTML。
- 本地预览及 Markdown／主题热重载。
- Playwright Chromium 驱动的 PDF 与逐页 PNG 导出。
- Preflight 人类可读输出和 `report.json`。
- PNG contact sheet。
- 参考图主题的 `theme-review.html`。
- 原子导出目录、`delivery.json` 完成标记，以及 HTML／PDF／PNG 页数和 PNG 尺寸一致性检查。
- `build.json` 与 `report.json` 中的 Chromium、Node.js、字体族和引擎运行时记录。
- 单元、契约、集成、浏览器和视觉回归测试。

## 安全与边界

- 拒绝原始 HTML、脚本、事件属性和危险链接协议。
- 图片只接受工作区内的本地相对路径，并检查真实路径和符号链接边界。
- 主题 CSS 禁止远程 `@import`、远程 URL、画布覆盖和隐藏内容。
- 主题 CSS 的本地资产会校验存在性、文件类型、真实路径和主题目录边界。
- 输入限制为 500 KiB、10,000 个 AST 节点和 32 层嵌套。
- 输出必须位于允许的工作区内，且目标目录不能预先存在。
- 渲染和导出默认阻断网络请求。
- 不覆盖源 Markdown 或已有输出。
- 失败导出不会创建最终目录；`.partial-*` 工作目录没有 `delivery.json` 完成标记，不能被识别为交付物。

## 关键入口

- CLI：`src/cli.ts`。
- Parser：`src/parser.ts`。
- Deck IR：`src/types.ts`。
- Planner：`src/planner.ts`。
- Renderer：`src/renderer.ts`。
- Theme Contract：`src/theme.ts`。
- Preflight：`src/preflight.ts`。
- Exporter：`src/exporter.ts`。
- Preview：`src/preview.ts`。
- 完整示例：`examples/specimen.md`。
- 主题模板：`themes/_template/`。

## 安装与使用

```bash
npm install
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
npm run build
```

```bash
npm run html-ppt -- build examples/specimen.md --theme base-light --output output/my-html
PLAYWRIGHT_BROWSERS_PATH=0 npm run html-ppt -- check examples/specimen.md --theme base-light --strict --output output/my-check
PLAYWRIGHT_BROWSERS_PATH=0 npm run html-ppt -- export examples/specimen.md --theme base-light --format all --output output/my-export
```

## 验证结果

### 干净安装

在隔离目录 `/tmp/html-ppt-release-clean.gMJu3E` 执行 `npm ci --ignore-scripts` 成功，安装 98 个包；随后类型检查、非浏览器测试和主题契约检查通过。该副本未复用项目的 `node_modules/`、`build/` 或 `output/`。

### 自动化验证

```text
npm run typecheck       通过
npm test                26 个执行项：25 通过，1 个浏览器／端口项按设计跳过
npm run check:themes    2 个主题通过，各自 specimen 覆盖 12 种布局
npm run test:browser    12 项全部通过，包含真实 Chromium、导出、缩放、原子失败和热重载
npm run test:visual     2 项通过，对应双主题 24 张布局截图
```

### 最终示例产物

基础主题：`output/delivery-base-v0.1/`

- HTML 12 页。
- PDF 12 页，首页面积 `960 × 540 pt`，对应 `13.333in × 7.5in`。
- PNG 12 张，每张 `2560 × 1440`。
- Preflight：0 错误、0 警告。
- build id：`d56467da77284f04`。
- 包含 `contact-sheet.html` 和状态为 `complete` 的 `delivery.json`。

深色主题：`output/delivery-dark-v0.1/`

- HTML 12 页。
- PDF 12 页，首页面积 `960 × 540 pt`，对应 `13.333in × 7.5in`。
- PNG 12 张，每张 `2560 × 1440`。
- Preflight：0 错误、0 警告。
- build id：`c19dc48b8dbfebaa`。
- 包含 `contact-sheet.html`、`theme-review.html` 和状态为 `complete` 的 `delivery.json`。

两套主题的 HTML、Deck IR、Planned IR、Preflight、PDF 和 PNG 均为 12 页；PNG 全部为 `2560 × 1440`，PDF 首页为 `960 × 540 pt`，对应 `13.333in × 7.5in`。两套 Planned IR 的 id、页序、kind、layout 和 Block 内容一致。`build.json` 与 `report.json` 记录的 Chromium 均为 `151.0.7922.34` 且相互一致。

严格检查报告位于 `output/delivery-check-base-v0.1/` 和 `output/delivery-check-dark-v0.1/`，均为 12 页、0 错误、0 警告。所有最终 JSON 与 HTML 都经过绝对工作区路径、密钥模式和调试标记扫描。

## 与架构的实际关系

- 沿用 Markdown → Deck IR → Planner → HTML Renderer → Preflight／Exporter 主链路。
- v0.1 未引入 React、Vite 或模板框架，Renderer 使用 TypeScript 直接生成静态 HTML。
- PDF 和 PNG 始终从同一 HTML 构建产物生成。
- v0.1 使用带完成标记的原子目录重命名区分成功交付和中途失败；这是对架构中“失败不产出可交付物”的具体实现。
- Style Extractor 在 v0.1 以协议、模板、演练主题和审核页交付，不包含自动字体识别或外部素材抓取。

## 未实现能力

- 可视化拖拽编辑器。
- 在线服务、账号、云存储和多人协作。
- 4∶3、A4 和竖版画布。
- 视频、音频和复杂动画。
- `.pptx` 输出，包括高保真不可编辑和有限可编辑模式。
- 自动生成演讲内容、外部事实研究和文案润色。
- CI/CD、部署和公开发布。

## 已知限制

- 当前字体使用系统字体栈，跨操作系统可能出现细微排版差异，因此视觉基线与浏览器版本绑定。
- Preflight 是确定性的几何检查，复杂的有意重叠组件需要显式标记或新增规则。
- 内容自动拆页目前以 Block 和列表项为边界，不重写长段落。
- 主题参考图分析仍由人工／AI 协作完成，不能仅凭单张图片推断未展示的组件规则。

## 下一阶段

- 使用用户提供且授权明确的真实参考图执行一次完整主题提取。
- 根据真实文稿扩展 Block 类型和布局预算。
- 评估 `pptx-flat`，明确其作为图片型 PPTX 的产品价值后再实施。
- 只有在可编辑需求明确且接受样式子集时，才设计独立 `pptx-editable` Renderer。
