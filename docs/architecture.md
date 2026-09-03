# html-ppt 项目架构

## 1．架构结论

本项目定位为：

> 一个以 Markdown 为内容入口、以结构化 Deck IR 为核心、以 HTML 为唯一视觉真相源、以主题包承载视觉系统、可稳定导出 PDF、PNG 和高保真图片型 PPTX 的演示文稿生成器。

核心流水线为：

```text
deck.md
   ↓
Markdown AST
   ↓
Deck IR（内容语义）
   ↓                  reference.png
布局选择器                 ↓
   ↓              Style Extractor
HTML Renderer ←──── Theme Package
   ↓
HTML／预览／截图／视觉检查
   ↓
PDF／PNG／图片型 PPTX
```

设计重点不是简单完成“Markdown 转 HTML”，而是在输入与输出之间建立稳定的内容语义模型、主题契约、布局系统和视觉验收机制。

## 2．产品边界

### 2.1 第一阶段产物

- HTML：唯一标准产物，所有视觉效果以 HTML 为准。
- PDF：HTML 的打印态派生物。
- PNG：逐页渲染结果，用于分享、测试和打包进图片型 PPTX。
- PPTX：将同一组 `2560 × 1440` PNG 逐页封装进标准 16∶9 OOXML，每页只有一个满版图片对象。

### 2.2 PPTX 边界

项目暂不承诺“完全可编辑且与 HTML 像素级一致”的 PPTX。这两个目标存在天然冲突：

- 追求视觉一致时，可以将每页 HTML 渲染成图片后放入 PPTX，但页面元素不可编辑。
- 追求元素可编辑时，必须从 Deck IR 单独实现 PPTX Renderer，并限定支持的布局和样式子集。
- 不尝试将任意 HTML 和 CSS 无损转换成可编辑 PPTX。

当前实现与未来边界明确分开：

```text
export --format pptx-flat  # 已实现：高保真、不可编辑
pptx-editable              # 未实现：有限样式、可编辑
```

`pptx-flat` 只接受通过 Preflight 的 HTML 派生 PNG，不读取 Markdown 或 Deck IR 重新排版。项目使用 JSZip 生成所需的最小 OOXML 部件，避免引入第二套布局引擎。可编辑模式如进入后续 Goal，仍必须从 Deck IR 单独设计 Renderer 与受支持样式子集。

## 3．架构原则

### 3.1 HTML 是唯一视觉真相源

- HTML 决定最终布局、字体、颜色、图形和图片处理。
- PDF 和 PNG 必须由同一 HTML 构建产物生成。
- 视觉验收以真实浏览器中的 HTML 截图为基准。
- 播放模式可以包含动画，但导出模式必须使用确定的静态状态。

### 3.2 内容、结构、视觉和导出分层

- Markdown 表达内容以及有限的页面意图。
- Deck IR 表达演示文稿语义。
- Layout 表达内容如何组织成页面。
- Theme Package 表达视觉设计系统。
- Renderer 负责生成 HTML。
- Exporter 负责从 HTML 派生其他格式。

### 3.3 确定性优先

AI 可以参与风格提取、页面类型判断、布局选择和内容拆页建议，但解析、Schema 校验、渲染、导出和质量检查必须是可重复执行的确定性流程。

## 4．Markdown 输入层

Markdown 应保持容易编写，同时提供必要的演示文稿语义。

```md
---
title: AI 工程实践
theme: editorial-dark
ratio: 16:9
---

<!-- slide: cover -->

# AI 工程实践

从工具使用走向系统建设

---

<!-- slide: metrics -->

# 本季度核心结果

:::metric{value="42%" label="交付效率提升"}
:::

:::metric{value="18" label="落地工作流"}
:::

---

<!-- slide: comparison -->

# 两种工作方式

## 过去

- 人工整理资料
- 手工排版
- 多次修改格式

## 现在

- 内容结构化
- 自动匹配布局
- HTML 统一渲染
```

输入语法遵循以下原则：

- YAML frontmatter 管理整份文稿元数据。
- `---` 分隔幻灯片。
- 一级标题通常表示页面标题。
- 普通 Markdown 表达正文、图片、代码和表格。
- 注释或 directive 只表达页面类型、语义组件和有限布局意图。
- Markdown 不直接写绝对坐标或主题 CSS。
- 默认禁止任意 HTML；如果未来开放，必须作为显式的不安全能力并进行清洗。

Markdown 解析建议使用 `unified／remark`。它会将 Markdown 解析成 `mdast`，适合继续转换成项目自己的 Deck IR，也支持通过插件扩展 frontmatter 和 GFM。参考：[remark 官方文档](https://github.com/remarkjs/remark) 。

Markdown 转 HTML 时必须考虑 XSS 和超大输入带来的资源消耗。参考：[remark 安全说明](https://github.com/remarkjs/remark#security) 。

## 5．Deck IR

Markdown 不应直接渲染成最终 HTML。中间必须存在稳定的 Deck IR，用于表达：

- 哪些内容属于同一页。
- 页面承担什么叙事作用。
- 内容块分别是标题、正文、指标、引用、图片还是图表。
- 当前页面偏好哪类布局。
- 内容超限时应该换布局、拆页还是报错。
- 当前主题是否支持所需布局和内容块。

建议的最小模型如下：

```ts
interface Deck {
  meta: {
    title: string
    theme: string
    ratio: "16:9"
    language: string
  }
  slides: Slide[]
}

interface Slide {
  id: string
  kind:
    | "cover"
    | "section"
    | "content"
    | "metrics"
    | "comparison"
    | "timeline"
    | "quote"
    | "image"
    | "ending"
  layoutHint?: string
  blocks: Block[]
  notes?: string
}
```

`layoutHint` 只能表达布局意图，不能携带任意 CSS 或绝对坐标。Deck IR 应有独立 Schema 和版本号，避免 Markdown 语法、主题实现或导出器变化时破坏全部链路。

## 6．Theme Package

主题不是一份 CSS，而是一套可版本化、可验证的视觉系统包。

```text
themes/
  editorial-dark/
    theme.json
    tokens.css
    components.css
    layouts/
    assets/
    references/
      source.png
    specimen.md
    specimen.html
    README.md
```

### 6.1 `theme.json`

`theme.json` 保存机器可读的设计系统和主题能力：

```json
{
  "name": "editorial-dark",
  "schemaVersion": 1,
  "engine": ">=1",
  "canvas": {
    "ratio": "16:9",
    "safeArea": 64,
    "grid": {
      "columns": 12,
      "gap": 24
    }
  },
  "typography": {
    "display": {},
    "heading": {},
    "body": {},
    "caption": {}
  },
  "colors": {},
  "spacing": {},
  "radii": {},
  "shadows": {},
  "imageTreatment": {},
  "chartPalette": [],
  "supportedLayouts": []
}
```

### 6.2 主题组成

- `tokens.css`：颜色、字体、字号、行高、间距、圆角、描边、阴影和动效参数。
- `layouts/`：封面、章节页、双栏、指标、引用、时间线等页面语法。
- `assets/`：经过授权并纳入版本管理的字体、图片、SVG 和装饰资源。
- `references/`：原始参考图，用于追溯主题设计依据。
- `specimen.md`：覆盖所有核心布局和组件的主题验收样张。

布局是风格的一部分，不能把多风格简单理解为更换颜色和字体。主题只有完整渲染 specimen 并通过检查后才能视为可用。

## 7．参考图到视觉设计系统

参考图是设计系统的输入证据，`theme.json`、主题实现和 specimen 才是可长期复用的风格锚点。

单张参考图无法可靠证明完整字体家族、全部字号、图表体系和所有页面布局。因此，风格提取不能假装所有结论都确定。

### 7.1 提取维度

1. 色彩角色：背景、正文、弱化文字、强调色和状态色。
2. 字体系统：标题、正文、数字和注释的字重、比例与行高。
3. 空间系统：外边距、栅格、间距基数和内容密度。
4. 几何特征：圆角、描边、阴影、分割线和容器形态。
5. 版式语法：对齐方式、留白重心、标题位置和视觉动线。
6. 图片处理：裁切、蒙版、滤镜、叠色、边框和圆角。
7. 图形语言：装饰元素、图标、标签、编号和强调块。
8. 数据可视化：颜色序列、坐标轴、标签、网格线和数字风格。
9. 禁止规则：该风格中不应出现的视觉表达。

### 7.2 置信度与待确认项

提取结果必须记录置信度和无法从图片确认的信息：

```json
{
  "confidence": {
    "palette": "high",
    "fontFamily": "low",
    "spacing": "medium"
  },
  "unresolved": [
    "原图无法确定字体名称",
    "原图没有展示表格样式"
  ]
}
```

### 7.3 提取工作流

1. 保存原始参考图 → 验证：来源图和主题版本可以追溯。
2. 提取结构化 Style Spec → 验证：每条规则都有图像依据或明确标记为推断。
3. 生成 Theme Package 和完整 specimen → 验证：核心页面类型均能渲染。
4. 输出缩略图总览供确认 → 验证：整套设计语言保持一致，而非只复刻单页。
5. 通过确认后锁定主题版本 → 验证：相同输入能够重复生成相同结果。

参考图中的 logo、版权图片和专有素材不应默认复制到主题资产中。除非用户明确提供使用权，否则只提取抽象的视觉规律。

## 8．布局系统

### 8.1 核心布局原型

第一阶段只提供有限、稳定、可验证的布局集合：

- `cover`
- `section`
- `title-body`
- `two-column`
- `image-text`
- `metrics`
- `comparison`
- `timeline`
- `quote`
- `chart`
- `full-bleed-image`
- `ending`

每种布局必须声明支持的 Block 类型、内容数量和长度预算、最小字号、安全区、图片比例和裁切策略，以及超限处理策略。

### 8.2 内容预算

布局必须有明确预算，例如：

```text
title：最多 2 行
body：最多 6 个要点
metric-grid：最多 4 项
two-column：每栏最多 5 个要点
```

内容超限时按以下顺序处理：

```text
切换更合适布局 → 拆页 → 报告错误
```

禁止通过无限缩小字号来隐藏溢出问题。

### 8.3 AI 的边界

AI 可以判断页面类型、从候选布局中选择一个、提议拆页或精简，以及从参考图提取视觉规则。

AI 不直接负责每次自由生成整份 CSS、随机决定绝对坐标、在导出阶段临时修改内容，或对同一输入产生不可复现的排版。

## 9．HTML 渲染标准

### 9.1 画布

建议使用固定的 `1280 × 720` 逻辑画布：

- 对应标准 16∶9。
- 浏览器中只做整体等比例缩放，不做响应式重排。
- 高分辨率 PNG 通过 `deviceScaleFactor: 2` 输出为 `2560 × 1440`。
- PDF 使用 `13.333in × 7.5in` 页面尺寸。

### 9.2 资源确定性

- 字体、图片和 SVG 等资源必须进入构建产物。
- HTML 应可离线打开，导出不得依赖临时网络请求。
- 导出前必须等待 `document.fonts.ready` 和全部图片完成加载。
- 对远程内容进行缓存时要保存来源信息和内容哈希。

### 9.3 打印模式

PDF 建议由 Playwright 驱动 Chromium 输出。`page.pdf()` 使用打印媒体样式，并支持 CSS 页面尺寸、背景图形和精确颜色设置。参考：[Playwright `page.pdf()`](https://playwright.dev/docs/api/class-page#page-pdf) 。

CSS 侧使用 `@page` 设置页面尺寸和边距，使用 `break-after: page` 确保每个 slide 独立分页，使用 `print-color-adjust: exact` 保留背景和颜色。参考：[MDN `@page`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page) 。

## 10．Preflight 质量检查

生成成功不等于幻灯片可用。每次构建至少检查：

- 文本是否溢出。
- 元素是否越过安全区。
- 元素是否意外重叠。
- 字体是否成功加载。
- 图片是否缺失或分辨率不足。
- 正文是否低于主题规定的最小字号。
- 前景和背景是否明显缺乏对比。
- 内容密度是否超过布局预算。
- HTML 页数与 PDF 页数是否一致。
- 页面是否存在浏览器运行错误。

检查结果应定位到具体页面和问题：

```text
Slide 04  ERROR  body-overflow
Slide 07  WARN   image-resolution-low
Slide 09  WARN   title-too-long
```

存在 `ERROR` 时构建应返回失败，不得静默输出一个“可以打开但不可用”的文件。

## 11．目录与模块

第一阶段使用单个 Node.js＋TypeScript 工程，不提前建立 monorepo：

```text
AGENTS.md
README.md
ROADMAP.md
docs/
  architecture.md
  markdown-spec.md
  theme-spec.md
src/
  cli/
  parser/
  schema/
  planner/
  layouts/
  renderer/
  preflight/
  exporters/
  preview/
themes/
  base/
examples/
tests/
  fixtures/
  contracts/
  visual/
```

模块职责如下：

- `parser`：Markdown → Markdown AST。
- `schema`：Markdown AST → Deck IR，并执行 Schema 校验。
- `planner`：判断页面类型并选择布局。
- `layouts`：提供有限、确定的布局原型。
- `renderer`：Deck IR＋Theme Package → HTML。
- `preflight`：在真实浏览器中检查布局和资源。
- `exporters`：HTML → PDF／PNG。
- `preview`：本地实时预览。
- `themes`：独立版本化的视觉系统。

前端组件技术可以在实现阶段确定，但核心 Renderer 必须能够生成静态、可离线打开的 HTML，不能把运行时框架变成输出文件的必要条件。

## 12．测试策略

### 12.1 单元测试

- Markdown 分页和 frontmatter 解析。
- Markdown AST 到 Deck IR 的语义映射。
- Schema 校验和错误定位。
- 内容预算和布局候选选择。

### 12.2 主题契约测试

- 所有主题都能渲染统一 specimen。
- 主题声明的布局和实际实现一致。
- 必需 token、字体和资产完整。

### 12.3 浏览器检查

- 元素边界、溢出和重叠检查。
- 字体与图片加载状态检查。
- HTML 截图视觉回归。

### 12.4 导出检查

- PDF 页面数量、尺寸和背景正确。
- PNG 尺寸固定且无缺失页面。
- 相同输入和主题生成稳定结果。

## 13．实施路线

1. 建立项目三文档和架构规格 → 验证：项目目标、执行边界和核心架构有唯一说明。
2. 定义 Markdown Spec、Deck IR Schema 和 Theme Contract → 验证：示例输入能通过 Schema 校验。
3. 实现单主题的 `Markdown → Deck IR → HTML` 最小闭环 → 验证：示例文稿可稳定生成完整 HTML。
4. 加入 PDF 和 PNG 导出 → 验证：页数、尺寸、字体、背景和截图一致。
5. 加入 8～12 种核心布局及内容预算 → 验证：每种布局都有 fixture 和截图基线。
6. 实现 Theme Package Contract → 验证：同一份 Markdown 无修改切换至少两个主题。
7. 建立参考图提取工作流 → 验证：参考图能生成 Style Spec、主题包和 specimen 总览。
8. 加入 Preflight 与视觉回归 → 验证：溢出、缺字体、缺图片和页面尺寸错误会导致构建失败。
9. 实现高保真图片型 PPTX 输出 → 验证：OOXML 结构、内嵌图片哈希、PowerPoint 和 Keynote 实机验收通过；可编辑模式继续作为独立后续评估。

## 14．第一版成功标准

第一版不以页面数量或视觉特效数量为成功标准，而应满足：

> 一份 Markdown 可以无修改切换多个主题；每个主题输出稳定、无溢出的 HTML，并从同一 HTML 得到一致的 PDF。

项目最重要的三类长期资产是：

1. Deck IR：保证内容不被 Markdown 和 HTML 绑死。
2. Theme Contract：保证参考图可以沉淀成长期复用的视觉系统。
3. HTML Renderer＋Preflight：保证 HTML 是可验证的唯一视觉真相源。
