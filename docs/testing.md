# 测试与自测

## 测试分层

### 类型检查

```bash
npm run typecheck
```

使用严格 TypeScript 配置检查源码和非视觉测试。

### 单元与集成测试

```bash
npm test
```

覆盖 Markdown Parser、输入安全、Deck IR 确定性、布局推断与拆页、主题契约、三主题构建、输出防覆盖、CLI 退出码、版本一致性和图片型 PPTX OOXML 结构。本地端口测试在普通沙箱中跳过，并由浏览器测试完整执行。

若本机存在被 Git 忽略的 `inputs-private/goal-002/`，集成测试还会校验来源哈希、4 章／17 个概念覆盖、27 页双主题语义一致性和桌面源文稿未变化；公开仓库的干净副本会明确跳过这项私有输入测试。

### 浏览器测试

```bash
npm run test:browser
```

覆盖：

- 真实 Chromium Preflight。
- PDF 页数和 `13.333in × 7.5in` 页面尺寸。
- 12 张 `2560 × 1440` PNG。
- `pdf`、`png`、`pptx-flat` 与 `all` 四种导出矩阵。
- 图片型 PPTX 的页数、16∶9 页面尺寸、单页单图关系、内嵌 PNG 哈希和不可编辑交付元数据。
- contact sheet。
- 画布缩放且不触发内容重排。
- 默认逐页演示模式、显式全页渲染模式，以及 1920 × 1080、3404 × 1728、1024 × 768 三种视口下的主题化舞台。
- 键盘、滚轮／触控板阈值、首尾页、合法／非法 hash、快速输入冷却、窗口变化和 `prefers-reduced-motion`。
- 越界、溢出、重叠、字体／图片加载、图片分辨率、小字号、控制台、页面异常和失败请求。
- 原子导出的完成标记、Chromium 元数据、`theme-review.html` 交付登记和失败目录语义。
- `cosmic-mint` 主题 SVG 资产内联、全屏同源银河舞台、陆地点阵地球缓慢转动、15 颗独立主星错峰漂移／闪烁、会话种子驱动的每波 1～3 颗随机流星，以及 `prefers-reduced-motion` 静态降级。
- 本地预览和源文件热重载。

### 视觉回归

```bash
npm run test:visual
```

三个正式主题各检查 12 种布局，共 36 张公开截图基线。默认允许的最大差异像素比例为 `0.001`。

若本机存在 Goal 002 私有输入，还会检查 7 张代表页，覆盖封面、章节、长文本、对比／流程、工具清单和总结；这些快照受 `.gitignore` 保护，不进入公开仓库。

首次建立或经审核更新基线时执行：

```bash
npm run test:visual:update
npm run test:visual
```

更新基线是显式操作。不得为通过测试而自动覆盖旧基线；需要先检查差异图和变更原因。

## 播放器模式回归

- 默认打开 `index.html` 使用演示模式，根元素为 `data-hp-mode="presentation"`，同一时刻仅一张 `.slide` 为活动页。
- `?mode=render` 使用全页渲染模式，Preflight、PNG 截图和自动化测试可以稳定访问全部页面。
- 打印媒体独立恢复所有页面并关闭切换动画，PDF 仍按源顺序每页输出一次。
- 演示模式必须保持 `documentElement.scrollHeight` 不产生自由纵向页面流；非 16∶9 视口只改变等比缩放和舞台余量，不改变 1280 × 720 逻辑画布。

动效人工回归应在最终 `index.html` 连续观察至少 30 秒：检查普通圆点主星各自缓慢漂移和亮度峰值、地球纹理转动，以及每波 1～3 颗流星以不同起点、终点和长度从左边缘进入、沿屏幕上半区向右上方运动并在 1.9～2.6 秒后从上边缘离开。触摸板回归需要覆盖 24px 小增量累计、同手势衰减尾流、尾流尚在时再次同向加速、56～119ms 短间隔新手势、静默 120ms 后的新手势和立即反向；每个独立手势只翻一页，但不得要求用户等待上一轮惯性完全消失。随后启用系统“减少动态效果”，确认页面位移、星空和地球冻结，随机流星调度停止并清空活动流星。

## 主题验收

```bash
npm run check:themes
```

每个正式主题必须实现统一 Contract，且其 specimen 覆盖全部标准布局。

## 最终自测顺序

```bash
npm run typecheck
npm test
npm run check:themes
npm run test:browser
npm run test:visual
```

随后使用目标主题执行严格 `check` 和 `export --format all`，并用 `base-light` 对同一真实内容复核，核对 `report.json`、PDF、PNG、PPTX、contact sheet 和主题审核页。

## 持续集成分层

- GitHub Actions 在 `push`、面向 `main` 的 Pull Request 和手工触发时运行。
- 核心矩阵为 Ubuntu 与 Windows、Node.js 24 LTS，执行干净安装、类型检查、非浏览器测试和三主题契约。
- 核心测试已经包含图片型 PPTX 的 OOXML 结构、图片关系和失败边界回归。
- workflow 只授予 `contents: read`，不使用 Secrets，不写回仓库，不发布或部署。
- Chromium 和视觉回归继续在固定发布环境执行，避免跨平台字体与浏览器渲染差异制造不稳定基线。
- PowerPoint 与 Keynote 继续属于发布前人工实机验收，不属于 CI 覆盖范围。

PPTX 验收分为三层：

1. 用 JSZip 解包 OOXML，检查 `presentation.xml`、slide、relationship 与 media 部件。
2. 比较每张内嵌 PNG 与 `slides/` 对应文件的 SHA-256，确认没有重编码或错序。
3. 在 Microsoft PowerPoint 与 Apple Keynote 中实际打开并放映 12 页 specimen 和真实 27 页文稿，确认无修复／不支持提示、四边铺满且页序正确。

当前环境没有满足依赖条件的独立 PPTX 渲染器，因此不得声称完成独立渲染验证；以源 PNG 全页检查、内嵌哈希一致性和双软件实机验收共同覆盖视觉正确性。

干净安装验证应在不复用 `node_modules/` 和 `build/` 的隔离副本执行 `npm ci --ignore-scripts`、类型检查、非浏览器测试和主题检查；Chromium 套件再使用与交付记录一致的项目内浏览器版本执行。

## 失败排查

- `BROWSER_START`：检查 Chromium 是否通过 `npm run browser:install` 安装；受限环境需允许浏览器进程。
- `INPUT_*`：检查 Markdown 大小、元数据、路径和安全语法。
- `THEME_*`：执行 `npm run check:themes`，检查 Manifest、token、布局或远程资源。
- `PREFLIGHT_FAILED`：打开 `report.json`，按 slide id、规则 id 和源行修复，禁止隐藏或裁切内容。
- `PPTX_*`：检查 PNG 是否存在且为 `2560 × 1440`、标签数量是否一致、目标文件是否已存在，以及输出目录是否可写。
- 视觉差异：查看 Playwright 输出的 actual、expected 和 diff，不确认原因不得更新基线。
