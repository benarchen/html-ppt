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

覆盖 Markdown Parser、输入安全、Deck IR 确定性、布局推断与拆页、主题契约、三主题构建、输出防覆盖和 CLI 退出码。本地端口测试在普通沙箱中跳过，并由浏览器测试完整执行。

若本机存在被 Git 忽略的 `inputs-private/goal-002/`，集成测试还会校验来源哈希、4 章／17 个概念覆盖、27 页双主题语义一致性和桌面源文稿未变化；公开仓库的干净副本会明确跳过这项私有输入测试。

### 浏览器测试

```bash
npm run test:browser
```

覆盖：

- 真实 Chromium Preflight。
- PDF 页数和 `13.333in × 7.5in` 页面尺寸。
- 12 张 `2560 × 1440` PNG。
- contact sheet。
- 画布缩放且不触发内容重排。
- 越界、溢出、重叠、字体／图片加载、图片分辨率、小字号、控制台、页面异常和失败请求。
- 原子导出的完成标记、Chromium 元数据、`theme-review.html` 交付登记和失败目录语义。
- `cosmic-mint` 主题 SVG 资产内联、陆地点阵地球缓慢转动、双流星非同步周期，以及 `prefers-reduced-motion` 静态降级。
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

随后使用目标主题执行严格 `check` 和 `export --format all`，并用 `base-light` 对同一真实内容复核，核对 `report.json`、PDF、PNG 数量、contact sheet 和主题审核页。

干净安装验证应在不复用 `node_modules/` 和 `build/` 的隔离副本执行 `npm ci --ignore-scripts`、类型检查、非浏览器测试和主题检查；Chromium 套件再使用与交付记录一致的项目内浏览器版本执行。

## 失败排查

- `BROWSER_START`：检查 Chromium 是否通过 `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium` 安装；受限环境需允许浏览器进程。
- `INPUT_*`：检查 Markdown 大小、元数据、路径和安全语法。
- `THEME_*`：执行 `npm run check:themes`，检查 Manifest、token、布局或远程资源。
- `PREFLIGHT_FAILED`：打开 `report.json`，按 slide id、规则 id 和源行修复，禁止隐藏或裁切内容。
- 视觉差异：查看 Playwright 输出的 actual、expected 和 diff，不确认原因不得更新基线。
