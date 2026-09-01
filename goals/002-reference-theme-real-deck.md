---
id: "goal-002"
name: "参考图主题与真实文稿闭环"
status: "complete"
created: "2026-08-31"
target: "v0.2.0"
depends_on: "goal-001"
source: "docs/style-extraction.md"
reference_input: "conversation-image-1"
content_input: "user-desktop/AI学习之路基础篇/01. AI 世界入门词典：小白必备概念清单.md"
---

# Goal 002：参考图主题与真实文稿闭环施工清单

## 1．目标

使用用户在对话中提供的 `Image #1` 作为唯一风格参考，以《AI 世界入门词典：小白必备概念清单》作为第一份真实业务文稿，完成一次可追溯、可复用、可验收的主题提取和真实文稿生成闭环：

> 参考图 → 来源与授权记录 → Style Spec → Theme Package → 真实内容映射 → 演示 Markdown → Deck IR → HTML → Preflight → PDF／PNG → 主题审核与交付记录。

本 Goal 的核心不是复刻参考图中的具体文案和素材，而是提取可复用的视觉设计系统，并证明它能稳定服务于参考图之外的真实内容。

## 2．已知输入与现状

### 2.1 风格参考

- 指定输入：当前对话中的 `Image #1`。
- 当前状态：原始参考图及两轮补充审核证据均已在私有目录归档，尺寸、SHA-256、用途和公开范围可追溯；文件由 Git 忽略。
- 施工要求：执行阶段先保存原始文件和来源元数据，再开始任何颜色、字体、版式或组件推断。
- 禁止事项：不得凭记忆或文字描述替代原图，不得把未在图中出现的规则伪装成观察事实。

### 2.2 真实 Markdown

- 文件名：`01. AI 世界入门词典：小白必备概念清单.md`。
- 本地来源：用户桌面下的 `AI学习之路/AI 学习之路基础篇/`。
- 只读检查结果：249 行、17,020 字节、4 个二级章节、17 个三级概念、3 个文章级分隔符。
- 当前兼容性：源文件没有项目要求的 YAML frontmatter；开头存在导语；`---` 用于文章段落分隔；单个章节内容远超一页内容预算，因此不能不经规划直接作为 v0.1 演示输入。
- 内容主题：AI 基础术语、使用层概念、工具清单与总结。
- 施工策略：保留源文件只读，建立来源快照、内容映射和独立的演示 Markdown，不修改桌面原文。

## 3．启动条件

- [x] Goal 001 已完成，`v0.1.0` 基线可用。
- [x] 本地 `main` 与公开 GitHub 仓库同步，工作树在制定本清单前为干净状态。
- [x] 用户已提供参考图和真实 Markdown 路径。
- [x] 真实 Markdown 已完成只读结构盘点。
- [x] 用户明确要求开始执行 Goal 002。
- [x] 参考图按用户施工指令仅授权本地分析与归档，不允许公开推送。
- [x] 真实文稿按默认边界仅限本地处理，不进入公开仓库。
- [x] `Image #1` 已以原始分辨率归档并记录 SHA-256、尺寸和文件格式。
- [x] 已确定本 Goal 的主题名称；名称必须在视觉提取后确定，禁止先用营销词猜测。

未满足“用户明确要求开始执行 Goal 002”时，只能维护本清单和 Roadmap，不得复制输入、生成主题、修改代码或更新视觉基线。

## 4．完成定义

只有同时满足以下条件，本 Goal 才能标记为 `complete`：

- [x] 参考图来源、授权状态、公开范围、原始文件哈希和尺寸均可追溯。
- [x] 形成包含观察事实、推断、`confidence`、`unresolved` 和禁用规则的 Style Spec。
- [x] 新主题实现统一 Theme Contract，并覆盖全部 12 种标准布局。
- [x] 新主题不是针对《AI 世界入门词典》写死的单文稿 CSS。
- [x] 桌面源文稿在施工前后哈希一致，没有被修改。
- [x] 来源快照、内容映射和演示 Markdown 的关系清晰可追溯。
- [x] 17 个三级概念和 4 个章节均在内容映射中有明确去向，不静默丢失。
- [x] 同一演示 Markdown 使用 `base-light` 与新主题时，页数、slide id、内容顺序和语义 Block 一致。
- [x] 新主题的 specimen 和真实文稿均通过严格 Preflight，结果为 0 `ERROR`、0 `WARN`。
- [x] HTML、PDF 和 PNG 页数一致，PDF 为 `13.333in × 7.5in`，PNG 为 `2560 × 1440`。
- [x] 双主题视觉基线、真实文稿关键页面基线和主题审核页均已人工复核。
- [x] 用户完成第一次参考图对照审核，并明确提出银河／星空、转动地球和流星动效两项修订意见。
- [x] 用户明确拒绝 `cosmic-mint` 0.1.1，并提供陆地点阵地球、颗粒银河和双流星细化参考。
- [x] 用户对 `cosmic-mint` 0.1.2 修订版完成复核并明确接受；主题版本锁定为 0.1.2。
- [x] 自动化测试、主题契约、浏览器测试和视觉回归全部通过。
- [x] 所有计划交付文档与实现一致，`ROADMAP.md` 已同步真实状态。
- [x] 工作树没有密钥、绝对本机路径、未授权素材、调试文件或由本 Goal 产生的孤儿代码。

## 5．执行协议

1. 读取 `AGENTS.md`、本文件、`ROADMAP.md`、`docs/style-extraction.md` 和 `docs/theme-spec.md` → 验证：范围、输入和红线无冲突。
2. 冻结输入来源、授权和公开范围 → 验证：未授权文件不会进入公开仓库或构建产物。
3. 先做内容盘点和 Style Spec，不写主题 CSS → 验证：设计决策有原图证据，不由实现反推规范。
4. 先建立失败用例或验收样张，再实施最小主题与布局改动 → 验证：缺口可复现，改动可回归。
5. 每完成一个阶段，先执行阶段自测，再勾选任务并同步 Roadmap → 验证：文档不领先于事实。
6. 用户视觉审核只在 Theme Contract、严格 Preflight 和自动化测试通过后进行 → 验证：用户审核聚焦设计判断，不承担基础排错。
7. 最终执行全量回归、产物核对、敏感信息扫描和 Git 审计 → 验证：达到完成定义后才能标记 `complete`。

## 6．施工边界

### 6.1 本 Goal 范围内

- 对一张指定参考图执行完整风格提取。
- 建立一套新的、可版本化的 Theme Package。
- 使用真实文章建立来源快照、内容映射和演示 Markdown。
- 在现有 Deck IR、12 种布局和 HTML Renderer 上完成真实文稿适配。
- 仅在真实证据证明现有能力不足时，补充最小 Block、预算或布局规则。
- 新主题 specimen、真实文稿视觉基线、主题审核页、HTML、PDF 和 PNG。
- Style Spec、内容映射、测试、交付报告和 Roadmap 更新。

### 6.2 明确不在本 Goal 范围内

- 任意参考图的全自动风格识别平台。
- OCR 服务、在线字体识别、外部 AI API 或素材抓取。
- 对参考图进行逐像素复制，或复用其中的品牌、logo、人物、图片和专有素材。
- 自动事实核查、重写文章立场、补充外部资料或纠正文中时效性判断。
- 通用文章自动摘要产品、自动演讲稿生成或文案润色系统。
- 新增 4∶3、A4、竖版、视频、动画或交互式组件。
- PPTX 输出、可视化编辑器、在线 SaaS、账号和云存储。
- npm publish、GitHub Release、版本标签、生产部署或公开推送；这些操作必须另行确认。

### 6.3 不可突破的工程边界

- HTML 仍是唯一视觉真相源，PDF 和 PNG 必须由同一 HTML 导出。
- 桌面源文稿只读，禁止覆盖、移动、重命名或格式化。
- 参考图和文稿的公开范围未确认前，禁止推送到公开 GitHub 仓库。
- 跟踪文件不得保存本机用户目录绝对路径；来源清单只记录脱敏名称、哈希和来源类别。
- Theme Package 必须服务于任意合法 Deck IR，禁止按 slide id、具体标题或正文写样式分支。
- 不通过隐藏、裁切、缩小到最小字号以下或删减未记录内容来通过 Preflight。
- 不因单篇文章不兼容就修改 Markdown Spec；只有至少两个独立 fixture 证明是通用缺口时才允许扩展语法。
- 不新增依赖，除非标准库和现有依赖无法完成，并先更新 `docs/dependencies.md`。
- 不执行删除、回滚、重置、覆盖、标签、推送或发布；确有需要时按项目红线单独确认。

## 7．关键设计决策

### 7.1 输入分层

真实文章不直接等同于演示文稿。施工时建立三层文件：

1. 来源清单：记录文件名、哈希、字节数、授权和公开范围，不记录本机绝对路径。
2. 来源快照：在获得许可后保存原文快照，保持内容不变。
3. 演示 Markdown：按照内容映射拆分页面，可压缩表达，但所有删减、合并和改写均可追溯。

若输入只允许本地处理，则使用被 `.gitignore` 排除的私有输入目录；不得为了方便把私有内容放入跟踪文件。

### 7.2 内容规划原则

- 4 个二级章节作为章节层级，不机械规定每章只能一页。
- 17 个三级概念全部进入内容覆盖矩阵。
- 每个概念至少有一处明确呈现；长概念允许拆成定义、类比、机制、场景或注意事项多页。
- 原文中的品牌、排行、地区可用性和时效性陈述按来源内容处理，不在本 Goal 内新增事实背书。
- 演示文稿优先保持教学路径：问题引入 → 底层概念 → 使用层概念 → 工具清单 → 总结。
- 预计页数仅用于容量规划，初始范围为 22～30 页；最终页数由内容预算和 Preflight 决定，不为凑页数截断内容。

### 7.3 风格复刻原则

- 提取视觉系统，不复制参考图内容。
- 观察事实与推断分开记录。
- 字体无法确认时只记录类别、字重、比例和候选 fallback，不宣称精确字体。
- 颜色从参考图采样后建立语义 token，禁止在组件 CSS 中散落无法解释的色值。
- 单张图未展示的组件规则进入 `unresolved`，通过 specimen 推演并明确标注为设计延伸。
- 用户审核以参考图、Style Spec、token、关键页面和全量 contact sheet 同屏对照为准。

## 8．阶段施工清单

## G0．输入冻结、授权与基线复现

### 任务

- [x] 记录当前 Git 分支、HEAD、工作树和现有测试状态。
- [x] 将 `Image #1` 以原始格式保存为受控参考输入，不压缩、不截图替代原图。
- [x] 记录参考图文件名、格式、像素尺寸、SHA-256、来源、权利声明和公开范围。
- [x] 计算桌面 Markdown 的施工前 SHA-256，记录行数、字节数和标题结构。
- [x] 确认真实文稿的公开范围，选择“可跟踪”或“仅本地”输入模式。
- [x] 创建脱敏的输入清单，不写入本机绝对路径。
- [x] 使用当前 v0.1 Parser 对原文执行失败复现，记录 `META_REQUIRED` 或后续预算错误，不以绕过方式消除。
- [x] 冻结本 Goal 的预期输出目录名称，所有输出使用全新目录。

### 验收标准

- [x] 两个输入都有唯一哈希、来源和公开范围。
- [x] 未授权或仅本地输入不会出现在 `git status` 的待提交列表。
- [x] 桌面原文没有被写入或改名。
- [x] 当前不兼容原因有可复现证据，不依赖口头判断。
- [x] 基线测试结果与 `ROADMAP.md` 一致。

### 自测

```bash
git status --short
git branch --show-current
git log -1 --oneline
npm run typecheck
npm test
npm run check:themes
```

### 阶段交付物

- 输入清单。
- 参考图原始文件或私有输入登记。
- Markdown 结构盘点和失败复现记录。

## G1．真实文稿来源快照与内容映射

### 任务

- [x] 在获得许可后建立原文快照；仅本地模式下放入忽略目录。
- [x] 建立来源段落到演示页的内容覆盖矩阵。
- [x] 为 4 个章节和 17 个三级概念分配页面角色。
- [x] 标记每一处保留、压缩、合并、拆分和省略，并写明理由。
- [x] 区分来源事实、教学类比、作者观点、产品推荐和时效性陈述。
- [x] 冻结演示标题、受众、语言、主题占位名和预计页数范围。
- [x] 设计封面、章节页、概念解释、对比、流程、引用、工具清单和总结等页面序列。
- [x] 先用结构化占位内容验证页面顺序，不提前写主题专属标记。

### 验收标准

- [x] 内容覆盖矩阵包含全部 17 个三级概念和 4 个章节。
- [x] 没有无法追溯到来源的新增事实。
- [x] 每一项被省略的内容都有明确记录，不存在静默丢失。
- [x] 页面顺序符合原文教学路径，并能解释每次拆分和合并。
- [x] 内容映射不包含 CSS、色值、坐标或主题专属字段。

### 自测

- [x] 逐项核对 H2／H3 标题覆盖率为 100％。
- [x] 随机抽查至少 5 个概念，从演示页反向定位到原文段落。
- [x] 对品牌排行、工具推荐和地区可用性等时效性表述建立来源标记。
- [x] 确认桌面原文 SHA-256 未变化。

### 阶段交付物

- `examples/ai-glossary/content-map.md`，或仅本地模式下的等价文件。
- `examples/ai-glossary/source-manifest.json`，或仅本地模式下的等价文件。

## G2．参考图 Style Spec 提取

### 任务

- [x] 分析参考图画布比例、构图、主次层级、视觉焦点和信息密度。
- [x] 提取背景、表面、正文、弱化、强调、辅助和边框颜色候选。
- [x] 提取字体类别、字号比例、字重、行高、字距、对齐和中英文混排规律。
- [x] 提取外边距、安全区、栅格、列宽、间距阶梯和留白节奏。
- [x] 提取圆角、描边、阴影、分隔、标签和容器几何。
- [x] 提取图片裁切、滤镜、蒙版、色调、边框和图文关系。
- [x] 提取图形、图标、装饰、数据图表和页码规则。
- [x] 记录参考图没有展示的组件和布局为 `unresolved`。
- [x] 为每项结论标记 `observation` 或 `inference`，并设置 `high`、`medium` 或 `low` 置信度。
- [x] 建立禁止规则，明确不得出现的配色、形状、密度和装饰语言。
- [x] 根据提取结果确定语义化主题名称和初始版本 `0.1.0`。

### 验收标准

- [x] Style Spec 覆盖颜色、排版、空间、几何、版式、图片、图形、图表和禁用规则。
- [x] 每个关键 token 都能追溯到参考图观察或明确的设计延伸。
- [x] 无法识别的字体、素材和组件不被写成确定事实。
- [x] `confidence` 与 `unresolved` 字段完整，不使用空泛的“整体类似”描述。
- [x] 参考图中的专有内容与可复用视觉规则已分离。

### 人工审核量表

每项按 1～5 分审核：

- [x] 色彩语言：5／5。
- [x] 排版层级：4／5。
- [x] 栅格与留白：4／5。
- [x] 几何与组件：4／5。
- [x] 信息密度：4／5。
- [x] 图片与装饰处理：初版 3／5，0.1.1 自评 4／5，0.1.2 自评 5／5。

初版实现自评 24／30；0.1.1 完成银河、分层星空、转动地球和非同步流星后自评 25／30，但被用户明确拒绝。0.1.2 按新增参考改为陆地专属细点阵、颗粒化斜向银河和更快双流星后自评 26／30，并于 2026-08-31 获得用户明确接受。

进入主题实现的最低标准为总分不低于 24／30，且色彩、排版、栅格三项均不低于 4 分。评分只用于检查提取完整性，不替代最终用户审核。

### 阶段交付物

- `themes/<theme-name>/style-spec.json`。
- `themes/<theme-name>/references/<reference-file>`，仅在允许跟踪时交付。
- Style Spec 初审记录。

## G3．Theme Package 实现

### 任务

- [x] 从 `themes/_template/` 创建新主题，不复制现有主题后只换颜色。
- [x] 完成 `theme.json` 的 Manifest、版本、画布、字体、颜色、间距、几何、图片和图表字段。
- [x] 将 Style Spec 转换为完整 `--hp-*` 语义 token。
- [x] 实现组件 CSS，并保持固定画布、安全区和最小字号约束。
- [x] 为 12 种标准布局设计一致而可辨识的主题表现。
- [x] 为参考图未展示的布局使用 Style Spec 推演规则，并标记设计延伸。
- [x] 禁止按真实文稿标题、页码、slide id 或具体正文写选择器。
- [x] 所有字体使用系统字体或授权明确的项目资产。
- [x] 所有 CSS 本地资产通过真实路径和主题目录边界检查。
- [x] 完成覆盖全部布局和边界内容的主题 specimen。

### 验收标准

- [x] `npm run check:themes` 通过。
- [x] 新主题 specimen 恰当覆盖 12 种标准布局。
- [x] 缺失 token、布局、字体、资产或越界资源的失败测试仍有效。
- [x] 新主题与 `base-light`、`editorial-dark` 有明确视觉差异。
- [x] Theme Package 不依赖真实文稿，替换为任意合法 Deck IR 仍可工作。
- [x] CSS 没有远程 URL、未授权字体、隐藏内容或画布覆盖。

### 自测

```bash
npm run typecheck
npm test
npm run check:themes
npm run html-ppt -- build themes/<theme-name>/specimen.md \
  --theme <theme-name> \
  --output output/goal-002-theme-specimen
```

### 阶段交付物

- `themes/<theme-name>/theme.json`。
- `themes/<theme-name>/tokens.css`。
- `themes/<theme-name>/components.css`。
- `themes/<theme-name>/specimen.md`。

## G4．真实演示 Markdown 与 Deck IR

### 任务

- [x] 创建符合 `docs/markdown-spec.md` 的演示 Markdown，补齐 frontmatter。
- [x] 使用显式分页和 slide kind 表达内容结构，不在 Markdown 中写 CSS。
- [x] 按内容预算拆分长段落、长列表和多层概念。
- [x] 为定义、类比、对比、流程、场景、工具和总结选择适合的现有布局。
- [x] 使用本地、授权明确的图片；没有合适素材时优先采用排版和基础图形，不抓取网络图片。
- [x] 为所有图片提供替代文字和来源记录。
- [x] 生成 Deck IR 和 Planned Deck IR，核对稳定 slide id 与页序。
- [x] 用 `base-light` 和新主题分别构建同一演示 Markdown。
- [x] 对照内容映射检查 17 个概念的覆盖情况。

### 验收标准

- [x] 演示 Markdown 通过 Parser 和 Deck IR 校验。
- [x] 页面数量处于内容规划的合理范围；超出范围有预算证据和说明。
- [x] 同一 Markdown 切换主题后 slide id、页数、Block 顺序和来源位置一致。
- [x] 没有静默截断、隐藏、超小字号或未记录的内容删减。
- [x] 桌面源文稿哈希仍与 G0 一致。

### 自测

```bash
npm run html-ppt -- inspect-ir examples/ai-glossary/deck.md
npm run html-ppt -- build examples/ai-glossary/deck.md \
  --theme base-light \
  --output output/goal-002-content-base
npm run html-ppt -- build examples/ai-glossary/deck.md \
  --theme <theme-name> \
  --output output/goal-002-content-theme
```

### 阶段交付物

- `examples/ai-glossary/deck.md`，或仅本地模式下的等价文件。
- Deck IR 与内容覆盖核对记录。

## G5．真实内容暴露的最小引擎补强

本阶段只在 G4 提供可复现证据时启动；若现有能力足够，则记录“不需要代码改动”并直接进入 G6。

### 实际结论

- [x] 真实内容没有暴露需要修改 Parser、Deck IR、Planner、布局预算或 Markdown Spec 的通用缺口。
- [x] G6 导出验收发现通用交付清单缺陷：任意 Style Spec 主题虽能生成 `theme-review.html`，但 `delivery.json` 曾写死只登记 `editorial-dark`。
- [x] CLI 已改为依据审核页的实际返回路径登记文件，并通过 `editorial-dark` 全格式原子导出回归测试；未改变 Deck IR Schema，未新增依赖。

### 允许任务

- [x] 内容缺口失败 fixture 不适用：现有内容测试和 27 页严格 Preflight 未复现通用内容缺陷。
- [x] 布局预算或确定性拆页调整不适用：显式内容规划已满足现有预算。
- [x] Markdown Block 渲染与 Preflight 补强不适用：现有检查完整覆盖本次输入。
- [x] 中文长标题、中英文混排、长列表和长段落修复不适用：三主题均通过回归。
- [x] Markdown Spec、Deck IR 类型与 Schema 无需更新；CLI 交付清单修复已同步测试和交付文档。

### 禁止任务

- [x] 不为单个标题或单页内容增加特判。
- [x] 不新增一次性布局名称或主题专属 Deck IR 字段。
- [x] 不改变 1280 × 720 逻辑画布和 HTML 真相源。
- [x] 不为了通过测试降低全局 Preflight 严格度。
- [x] 不顺手重构未暴露问题的 Parser、Renderer 或 Exporter。

### 验收标准

- [x] 唯一 CLI 交付清单改动有先复现、后通过的浏览器回归测试。
- [x] 内容与布局引擎无需改动，因此“双 fixture 证明通用内容需求”不适用；CLI 修复以 Theme Review 是否实际生成作为通用条件，不含主题名或文稿特判。
- [x] 现有两个主题和新主题全部回归通过。
- [x] Deck IR 没有兼容性变化，Schema 版本未升级。

### 自测

```bash
npm run typecheck
npm test
npm run check:themes
npm run test:browser
```

## G6．严格 Preflight、导出与主题审核

### 任务

- [x] 对新主题 specimen 执行严格 Preflight。
- [x] 对真实演示 Markdown 使用新主题执行严格 Preflight。
- [x] 对真实演示 Markdown 使用 `base-light` 执行严格 Preflight，排除内容本身的问题。
- [x] 导出新主题的 HTML、PDF、逐页 PNG、contact sheet 和 `theme-review.html`。
- [x] 核对 HTML、PDF、PNG 页数、命名、尺寸、build id 和运行时元数据。
- [x] 在阻断网络请求的浏览器上下文中完成导出。
- [x] 在主题审核页同时展示参考图、Style Spec、Manifest、token 和全部页面缩略图。
- [x] 抽查封面、章节页、长概念页、工具清单页和总结页。
- [x] 使用人工量表完成实施方参考图对照评分，初版为 24／30，0.1.1 为 25／30，0.1.2 为 26／30。
- [x] 用户已拒绝 0.1.1，并以五张细化参考明确陆地点阵、颗粒银河和更快双流星标准。
- [x] 0.1.2 已更新 Style Spec、主题 CSS、代码生成 SVG、资产内联、动效测试、严格 Preflight、全格式导出和视觉基线。
- [x] 0.1.2 动态 HTML、主题审核页、PDF 和验证结果已准备交付用户复核；如有新反馈，继续修订并重新执行全部阶段门禁。

### 验收标准

- [x] 新主题 specimen：0 `ERROR`、0 `WARN`。
- [x] 真实文稿新主题：0 `ERROR`、0 `WARN`。
- [x] 真实文稿基础主题：0 `ERROR`、0 `WARN`。
- [x] PDF、PNG 和 HTML 页数完全一致。
- [x] PNG 全部为 `2560 × 1440`，PDF 页面为 `13.333in × 7.5in`。
- [x] 主题审核量表总分不低于 24／30，关键三项不低于 4 分；0.1.2 为 26／30。
- [x] 用户第二轮反馈已全部修订并复验。
- [x] 用户确认 0.1.2 修订主题可接受。

### 自测

```bash
PLAYWRIGHT_BROWSERS_PATH=0 npm run html-ppt -- check examples/ai-glossary/deck.md \
  --theme <theme-name> \
  --strict \
  --output output/goal-002-check-theme
PLAYWRIGHT_BROWSERS_PATH=0 npm run html-ppt -- export examples/ai-glossary/deck.md \
  --theme <theme-name> \
  --format all \
  --output output/goal-002-delivery-theme
```

### 阶段交付物

- 严格 Preflight 报告。
- 双主题 HTML 对照。
- 新主题 PDF、PNG、contact sheet 和主题审核页。
- 用户审核与修订记录。

## G7．自动化测试与视觉回归

### 任务

- [x] 为新主题 12 种标准布局建立视觉基线。
- [x] 为真实文稿选取至少 6 个代表性页面建立独立视觉基线。
- [x] 代表页面至少包含封面、章节、长文本、对比／流程、工具清单和总结。
- [x] 增加内容覆盖矩阵与 Deck IR 页序一致性测试。
- [x] 增加桌面源文稿不被修改的哈希验证。
- [x] 增加新主题 Style Spec 来源哈希和置信度字段测试。
- [x] 增加同一真实 Deck 在 `base-light` 与新主题间语义一致的集成测试。
- [x] 显式更新视觉基线后立即执行普通视觉测试。
- [x] 在隔离副本执行干净安装和非浏览器测试。

### 验收标准

- [x] 新增测试同时覆盖正常、无效和边界输入。
- [x] 普通视觉测试不会自动更新参考基线。
- [x] 视觉失败会保留 actual、expected 和 diff。
- [x] 连续两次构建产生相同 Deck IR、页序、build id 和检查结果；时间戳字段除外。
- [x] 现有双主题 24 张基线没有未经审核的变化。
- [x] 干净安装不依赖本机绝对路径或未声明文件。

### 全量自测

```bash
npm ci --ignore-scripts
npm run typecheck
npm test
npm run check:themes
npm run test:browser
npm run test:visual:update
npm run test:visual
```

`npm run test:visual:update` 只在人工确认预期变化后执行，不得作为修复视觉失败的默认手段。

## G8．最终验收与交付

### 功能验收

- [x] 参考图、Style Spec、Theme Package 和审核页形成完整追溯链。
- [x] 新主题可渲染自己的 12 布局 specimen 和真实文稿。
- [x] 真实文稿可在新主题与 `base-light` 间无内容改动切换。
- [x] 内容覆盖矩阵证明 4 个章节和 17 个概念均有去向。
- [x] HTML、PDF、PNG 和报告从同一构建链路生成。
- [x] 非法主题资产、内容超限和 Preflight 错误能够阻止交付。

### 非功能验收

- [x] 桌面原文和参考原图保持不变。
- [x] 跟踪文件和构建产物不包含本机绝对路径、密钥或私有输入。
- [x] 未授权 logo、字体、图片和参考素材未进入 Theme Package。
- [x] 主题 CSS 没有单文稿特判。
- [x] 新增依赖为零；`docs/dependencies.md` 无需变更。
- [x] 文档命令、目录和实际实现一致。

### 最终质量门禁

- [x] `npm run typecheck` 成功。
- [x] `npm test` 成功。
- [x] `npm run check:themes` 成功。
- [x] `npm run test:browser` 成功。
- [x] `npm run test:visual` 成功。
- [x] 新主题与基础主题严格 Preflight 成功。
- [x] PDF、PNG、contact sheet 和主题审核页人工抽查通过。
- [x] `git diff --check` 无空白错误。
- [x] `git status --short` 只包含可追溯到本 Goal 的改动。
- [x] `ROADMAP.md` 与实际实现、测试和产物一致。

## 9．专项自测矩阵

| 类别 | 场景 | 期望结果 |
|---|---|---|
| 输入授权 | 参考图或文稿公开范围未确认 | 停止归档和公开操作，不猜测授权 |
| 来源不变 | 施工前后计算桌面原文哈希 | 哈希完全一致 |
| 原文兼容 | 直接输入无 frontmatter 的文章 | 明确失败，不修改源文件绕过 |
| 内容覆盖 | 4 个 H2、17 个 H3 | 覆盖矩阵为 100％，省略均有理由 |
| 内容预算 | 长段落、长列表和中英文混排 | 拆页或明确失败，不截断、不缩小规避 |
| 主题独立 | 同一 Deck 切换两个主题 | 页数、id、Block 和顺序一致 |
| 主题通用 | 新主题渲染标准 specimen | 12 种布局全部通过 |
| 资产安全 | 远程、缺失、绝对或越界资源 | Theme Contract 非零退出 |
| 字体不确定 | 原图字体无法确认 | 写入候选与低置信度，不冒充精确字体 |
| 风格延伸 | 原图未展示图表或时间线 | 标记 inference／unresolved，并接受人工审核 |
| 离线性 | 浏览器阻断网络 | HTML、PDF 和 PNG 仍完整生成 |
| Preflight | 溢出、越界、重叠、低分辨率 | 报告定位并阻止严格交付 |
| PDF | 真实多页文稿 | 页数一致、尺寸正确、无页眉页脚 |
| PNG | 真实多页文稿 | 数量一致、命名稳定、全部 2560 × 1440 |
| 视觉回归 | 新主题和代表性真实页面 | 显式基线，无未审核差异 |
| 隐私扫描 | 跟踪文件与输出 | 无本机用户目录绝对路径、密钥或仅本地输入 |

## 10．阻塞与停止条件

遇到以下情况必须停止对应施工并向用户说明：

- 参考图来源、使用权或公开范围无法确认。
- 真实文稿不允许复制，但当前方案要求进入跟踪目录。
- 需要删除、覆盖、移动或格式化桌面原文。
- 需要下载或使用未授权字体、logo、图片或品牌资产。
- 需要安装全局依赖、修改系统配置、`.env`、密钥或账号。
- 需要修改 CI/CD、公开推送、打标签、创建 Release 或部署。
- 需要外部 API、OCR、在线字体识别或付费服务。
- 参考图不是 16∶9，且用户要求改变项目固定画布。
- 用户要求逐像素复刻专有素材，而非提取视觉系统。
- 真实文稿适配要求发展为通用自动内容生成产品。
- 需要新增 PPTX 或可视化编辑能力才能验收。

普通布局、CSS、内容预算和测试问题不构成停止理由，应先用本地证据和最小改动解决。

## 11．完成后的交付文档

Goal 完成时必须核对并交付：

- [x] `README.md`：新增真实主题和示例的使用入口；仅写已验证能力。
- [x] `AGENTS.md`：没有新增稳定命令或项目红线，无需更新。
- [x] `ROADMAP.md`：记录 Goal 002 状态、完成项、验证、阻塞和下一步。
- [x] `docs/style-extraction.md`：沉淀私有参考、捕获界面排除和单图推演规则。
- [x] `docs/theme-spec.md`：Theme Contract 未变化，无需更新。
- [x] `docs/markdown-spec.md` 与 `docs/deck-ir.md`：输入规范和 Schema 未变化，无需更新。
- [x] `docs/testing.md`：补充第三主题和私有真实文稿视觉回归方式。
- [x] `docs/dependencies.md`：未新增依赖，无需更新。
- [x] `docs/delivery-goal-002.md`：最终交付报告。
- [x] `themes/cosmic-mint/style-spec.json`：参考图提取结果。
- [x] `themes/cosmic-mint/README.md`：主题定位、来源、适用场景、限制和审核方式。
- [x] `inputs-private/goal-002/content-map.md`：仅本地的来源到页面内容映射。
- [x] `inputs-private/goal-002/source-manifest.json` 与 `deck.md`：仅本地的来源、构建输入和处理边界；公开示例未创建。

`docs/delivery-goal-002.md` 至少包含：

1. Goal 范围、输入和公开范围。
2. 参考图来源、哈希、授权与主题名称。
3. Style Spec 的关键观察、推断、置信度和未决项。
4. 真实文稿结构、内容映射、最终页数和内容处理说明。
5. Theme Package 文件和版本。
6. 引擎改动及其必要性；没有改动时明确记录。
7. 全量验证命令、日期、环境和结果。
8. HTML、PDF、PNG、contact sheet 和主题审核页路径。
9. 人工量表、用户审核反馈和修订记录。
10. 已知限制、版权边界和未实现能力。
11. Git 状态；提交、标签、推送和发布未获授权时必须写“未执行”。
12. 下一阶段建议，不得写成已完成事项。

## 12．建议目录形态

公开范围允许时：

```text
examples/
  ai-glossary/
    README.md
    source-manifest.json
    source.md
    content-map.md
    deck.md
themes/
  <theme-name>/
    README.md
    theme.json
    tokens.css
    components.css
    specimen.md
    style-spec.json
    references/
      <reference-file>
tests/
  visual/
    snapshots/
docs/
  delivery-goal-002.md
```

仅本地模式下，原文和参考图进入被忽略的私有输入目录；可跟踪文件只能包含脱敏清单、通用主题代码和不泄露私有内容的测试 fixture。

## 13．Goal 状态维护

- `planned`：清单已建立，但用户尚未明确要求开始施工，或输入授权门禁尚未满足。
- `active`：用户明确要求执行，输入门禁满足，且至少一个阶段进行中。
- `blocked`：满足阻塞规则并已记录连续证据，无法在当前权限内推进。
- `complete`：完成定义、G0～G8、用户视觉审核、全量验收和交付文档全部满足。

每次状态变化必须同时更新本文件头部和 `ROADMAP.md`。不得因为已经生成一套“看起来接近”的页面，就跳过来源、内容覆盖、严格 Preflight、视觉回归或用户审核。
