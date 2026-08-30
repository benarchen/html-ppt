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

覆盖 Markdown Parser、输入安全、Deck IR 确定性、布局推断与拆页、主题契约、双主题构建、输出防覆盖和 CLI 退出码。本地端口测试在普通沙箱中跳过，并由浏览器测试完整执行。

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
- 原子导出的完成标记、Chromium 元数据和失败目录语义。
- 本地预览和源文件热重载。

### 视觉回归

```bash
npm run test:visual
```

双主题各检查 12 种布局，共 24 张截图基线。默认允许的最大差异像素比例为 `0.001`。

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

随后分别使用两个主题执行严格 `check` 和 `export --format all`，核对 `report.json`、PDF、PNG 数量和 contact sheet。

干净安装验证应在不复用 `node_modules/` 和 `build/` 的隔离副本执行 `npm ci --ignore-scripts`、类型检查、非浏览器测试和主题检查；Chromium 套件再使用与交付记录一致的项目内浏览器版本执行。

## 失败排查

- `BROWSER_START`：检查 Chromium 是否通过 `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium` 安装；受限环境需允许浏览器进程。
- `INPUT_*`：检查 Markdown 大小、元数据、路径和安全语法。
- `THEME_*`：执行 `npm run check:themes`，检查 Manifest、token、布局或远程资源。
- `PREFLIGHT_FAILED`：打开 `report.json`，按 slide id、规则 id 和源行修复，禁止隐藏或裁切内容。
- 视觉差异：查看 Playwright 输出的 actual、expected 和 diff，不确认原因不得更新基线。
