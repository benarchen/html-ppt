---
id: "goal-004"
name: "高保真图片型 PPTX 导出"
status: "complete"
created: "2026-09-02"
target: "v0.4.0"
depends_on: "goal-003"
source: "project-health-review-and-user-confirmed-plan"
---

# Goal 004：高保真图片型 PPTX 导出施工清单

## 1．目标

在不引入第二套排版引擎、不改变现有 HTML 视觉的前提下，将通过 Preflight 的 HTML 页面渲染为 `2560 × 1440` PNG，再把每张 PNG 作为唯一页面对象封装进标准 16∶9 `.pptx` 文件。

本 Goal 的完成结果应满足：同一份 Markdown 可以稳定交付 HTML、PDF、PNG 和高保真图片型 PPTX；PPTX 在 Microsoft PowerPoint 与 Apple Keynote 中均能无修复提示打开，页面顺序、比例和视觉与 HTML 派生 PNG 一致，同时明确标注内容不可编辑。

数据流冻结为：

```text
Markdown
  → Deck IR
  → Planned Deck IR
  → HTML
  → Preflight
  → 2560 × 1440 PNG
  → pptx-flat
```

HTML 继续作为唯一视觉真相源。PPTX 不得绕过 HTML 直接从 Markdown、Deck IR 或主题 token 重新排版。

## 2．背景与六项问题闭环

本 Goal 必须完整落实项目体检提出的六项后续工作：

1. 修正 CLI、构建元数据和过时文档中的版本漂移，并建立版本一致性检查。
2. 以本文件冻结 Goal 004 的范围、任务、验收、自测、边界和交付要求。
3. 完成最小 PPTX 封装方案的依赖、维护状态、许可证和兼容性评估。
4. 实现 `pptx-flat` 导出，并使用公开 specimen 与私有真实 27 页文稿验证。
5. 补齐自动化测试、交付文档和 Roadmap 记录，确保现有能力无回归。
6. 在 `v0.4.0` 功能验收后形成 CI 与公开分发决策，不在未授权情况下直接修改 CI 或执行公开发布。

已确认的当前事实：

- 项目当前版本为 `v0.3.0`，Goal 003 已完成并发布。
- CLI 帮助、`build.json.engineVersion` 和 build id 的引擎版本仍存在 `0.1.0` 硬编码，需要统一。
- 当前导出链路已经具备严格 Preflight、逐页 PNG、PDF、原子工作目录和 `delivery.json` 完成标记。
- 用户明确确认本机安装了 Keynote；终端尚未定位到标准应用路径，因此施工验收时必须通过 Launch Services、Launchpad 或用户可见界面实际启动，不能仅凭路径推断安装状态。

## 3．范围

### 3.1 包含

- 统一项目版本来源，并修正 CLI 与构建元数据的版本漂移。
- 更新 README、CLI、架构和测试文档中的过时能力描述。
- 引入一个维护状态和许可证满足要求的 ZIP 依赖，并在项目内生成最小 OOXML。
- 增加 `exportPptxFlat()` 导出能力。
- 扩展 `--format` 为 `pdf|png|pptx-flat|all`。
- 让 `--format all` 从 `v0.4.0` 起同时生成 PDF、PNG 和 PPTX。
- 扩展 `delivery.json` 的 PPTX 派生产物元数据。
- 增加 PPTX OOXML 结构、页数、比例、图片关系和原子失败回归。
- 使用三主题 specimen 与私有真实 27 页文稿执行最终导出。
- 在 PowerPoint 与 Keynote 中分别完成实机打开和放映验收。
- 更新 Goal、交付报告、README、相关规范和 Roadmap。
- 在功能验收后形成 CI 与公开分发的下一阶段决策记录。

### 3.2 不包含

- 可编辑文字、图表、表格、形状或主题母版。
- 任意 HTML／CSS 到 PowerPoint 原生对象的转换。
- `pptx-editable` Renderer。
- HTML 动画、流星、星光、页面切换或交互在 PPTX 中的保留。
- 视频、音频、演讲者备注和 HTML 链接交互的完整迁移。
- 4∶3、A4、竖版或用户自定义画布。
- 安装新的全局依赖或修改系统配置。
- 修改 CI／CD、GitHub Release、npm publish、部署、tag 或远端推送。

## 4．关键设计决策

### 4.1 依赖

最终方案冻结为：

- 运行时依赖：`jszip@3.10.1`。
- OOXML presentation、master、blank layout、slide、relationship、theme 和 media 部件由项目内最小模板生成。
- 不引入 PptxGenJS，不建立第二套布局或渲染引擎。

依赖复核与路线变更记录：

- `pptxgenjs@4.0.1` 安装后引入 `image-size@1.2.1`。
- `npm audit --json` 报告 `GHSA-w3rx-r6r6-pgpr` 与 `GHSA-5p2g-fcmc-qvqq` 两个高危无限循环拒绝服务漏洞，受影响范围为 `image-size <= 2.0.2`，官方 Advisory 当前没有修复版本。
- 漏洞触发格式为 ICNS、JXL 和 HEIF；本 Goal 只处理项目自身生成的 PNG，因此当前功能路径不直接解析这些格式，但公开项目不能在没有风险决策记录的情况下接受高危依赖报告。
- `npm audit` 建议降级 PptxGenJS 到 `1.1.5`，该建议会跨越多个主版本且不符合项目技术基线，明确不执行；禁止运行 `npm audit fix --force`。
- 最终移除 PptxGenJS 与 `image-size`，只保留 JSZip。在线 `npm audit --json` 为 0 个漏洞，`npm ls pptxgenjs jszip image-size --all` 无缺失或重复冲突。
- JSZip 官方仓库仍以 3.10.1 为当前版本，采用 MIT 或 GPLv3 双许可证，本项目按 MIT 使用。其 npm 版本发布较早，因此以固定版本、最小使用面、OOXML 自动化检查和双软件实机验收约束维护风险。

参考：

- https://github.com/gitbrent/PptxGenJS/releases
- https://github.com/gitbrent/PptxGenJS/blob/master/package.json
- https://github.com/Stuk/jszip
- https://github.com/Stuk/jszip/blob/main/LICENSE.markdown

### 4.2 页面与图片契约

- PPTX 页面尺寸固定为 `13.333333 × 7.5in`。
- 对应 OOXML 页面尺寸固定为 `12192000 × 6858000 EMU`。
- 每页仅包含一张来自最终 HTML 的 `2560 × 1440` PNG。
- 图片固定放置于 `x=0`、`y=0`、`w=13.333333`、`h=7.5`。
- 禁止裁切、留边、拉伸变形、重新排版或重新编码图片。
- PPTX 页序与 Planned Deck IR、HTML 和 PNG 页序完全一致。
- 每张图片的替代文本至少包含页码和 slide id。
- 文档标题取自 Markdown 元数据；作者写为 `html-ppt`；构建编号记录在 PPTX 元数据或交付清单中。

### 4.3 CLI 契约

```text
--format pdf|png|pptx-flat|all
```

| 格式 | 必须生成的派生产物 |
|---|---|
| `pdf` | `deck.pdf` |
| `png` | `slides/`、`contact-sheet.html`、可选 `theme-review.html` |
| `pptx-flat` | `slides/`、`contact-sheet.html`、可选 `theme-review.html`、`deck.pptx` |
| `all` | PDF、PNG、contact sheet、可选主题审核页、PPTX |

`pptx-flat` 保留 PNG，原因是 PNG 既是 PPTX 的真实页面来源，也是视觉审计和问题定位证据。不得为了只留下 `.pptx` 而新增需要事后删除的中间目录。

### 4.4 交付清单契约

`delivery.json` 保持 `schemaVersion: 1`，通过向 `artifacts` 增加可选字段保持向后兼容：

```json
{
  "pptxPages": 12,
  "pptxMode": "flat",
  "pptxEditable": false,
  "pptxSize": "13.333333x7.5in",
  "pptxImageSize": "2560x1440"
}
```

`files` 必须在实际生成 PPTX 时登记 `deck.pptx`。未生成 PPTX 的格式不得伪造这些字段。

### 4.5 确定性边界

- HTML、Deck IR、Planned Deck IR、build id、页面顺序和内嵌 PNG 必须保持确定。
- ZIP 时间戳或库内部打包元数据可能导致两个 `.pptx` 文件字节不同，因此不要求整个 PPTX 的 SHA-256 完全一致。
- 自动化测试必须比较 OOXML 结构、页面顺序、页面尺寸和内嵌图片哈希，不能用“文件存在”代替正确性验证。

## 5．启动条件

- [x] Goal 003 已完成并发布为 `v0.3.0`。
- [x] 用户接受图片型、不可编辑 PPTX 路线。
- [x] 用户确认 `--format all` 应包含 PPTX。
- [x] 用户确认本机有 Keynote，Keynote 纳入硬验收。
- [x] 已完成 PptxGenJS 初步维护状态、许可证和能力调研。
- [x] 用户明确要求开始实施 Goal 004。
- [x] 施工前工作树、版本、运行时和完整测试基线已记录。
- [x] 安装前依赖复核已消除高危传递依赖阻断。

在用户只要求施工清单而未明确要求施工时，本 Goal 保持 `planned`，不得安装依赖、修改源代码、生成候选 PPTX 或更新视觉基线。

## 6．完成定义与验收标准

只有以下项目全部满足，本 Goal 才能标记为 `complete`：

### 6.1 版本与文档

- [x] CLI、项目包、构建元数据使用同一项目版本。
- [x] 版本不一致时自动化测试失败。
- [x] 项目候选版本统一升级为 `0.4.0`。
- [x] README、CLI、架构、依赖和测试文档不再把图片型 PPTX 写成未实现能力。
- [x] 可编辑 PPTX 仍明确写为未实现和非承诺能力。

### 6.2 功能

- [x] `--format pptx-flat` 可以生成 `deck.pptx`。
- [x] `--format all` 同时生成 HTML、PDF、PNG 和 PPTX 派生产物。
- [x] `pdf` 与 `png` 的原有行为不发生非预期变化。
- [x] PPTX 页数、顺序与 HTML、PNG、Planned Deck IR 一致。
- [x] 每个 PPTX 页面只有一张完整铺满画布的图片。
- [x] PPTX 页面为标准 16∶9，没有黑边、白边、裁切或拉伸。
- [x] 内嵌 PNG 与源 PNG 的 SHA-256 一致。
- [x] PPTX 明确标记为 `flat` 且 `editable: false`。
- [x] PDF、PNG 或 PPTX 任一失败时，最终交付目录都不会出现。

### 6.3 自动化质量

- [x] 类型检查、非浏览器测试、三主题契约、浏览器测试和视觉回归全部通过。
- [x] 三个主题的现有 HTML 视觉基线不发生变化。
- [x] 新增 PPTX 格式矩阵、OOXML 结构、失败原子性和版本一致性回归。
- [x] 隔离安装后可以完成非浏览器质量门禁。
- [x] `git diff --check`、绝对私有路径和高置信度密钥扫描无命中。

### 6.4 实际产物

- [x] `base-light`、`editorial-dark`、`cosmic-mint` 的 12 页 specimen 均成功生成 PPTX。
- [x] 私有真实 27 页文稿成功生成 PPTX。
- [x] 四套 PPTX 均完成全页渲染和逐页视觉检查。
- [x] Microsoft PowerPoint 实机打开 12 页和 27 页产物，无修复提示。
- [x] Apple Keynote 实机打开 12 页和 27 页产物，无修复或不支持内容提示。
- [x] PowerPoint 与 Keynote 放映时页数、顺序、比例、清晰度和四边铺满符合预期。

### 6.5 收尾

- [x] Goal 004 施工记录和交付报告完整。
- [x] `ROADMAP.md` 记录真实验证结果、阻塞和发布状态。
- [x] CI 与公开分发形成明确的后续决策记录，但未在无授权情况下直接实施。
- [x] 用户明确接受最终 PPTX。

## 7．施工任务

### G0：冻结基线并启动 Goal

1. 将本文件状态从 `planned` 更新为 `active`。
2. 同步 `ROADMAP.md` 当前阶段。
3. 记录 Git 提交、分支、Node.js、npm、Chromium、PowerPoint 和 Keynote 环境。
4. 执行施工前完整测试，保留测试数量和结果。

验证：基线工作树干净，现有能力全部通过，未将私有真实文稿或输出目录纳入 Git。

实施记录（2026-09-02）：

- 基线为 `main@53600e1`；施工前仅包含本 Goal 与 Roadmap 的规划文档修改。
- Node.js 为 `26.0.0`，npm 为 `11.12.1`。
- `npm run typecheck` 通过。
- 非浏览器测试 29 项：28 通过、1 项按设计跳过。
- 三个主题契约检查通过，每个 specimen 均覆盖 12 种布局。
- Chromium 回归 15 项全部通过；首次受限沙箱无法启动浏览器并绑定回环端口，按项目规范在允许的浏览器环境重跑后通过。
- 视觉回归 4 组全部通过，施工前没有基线差异。

### G1：统一版本来源并修正文档漂移

1. 增加统一版本常量或等价的单一版本读取机制。
2. 替换 CLI 帮助、`build.json.engineVersion` 和 build id 中的硬编码版本。
3. 增加版本与 `package.json` 一致性测试。
4. 修正 README 与长期文档中过时的 `v0.1` 阶段措辞。

验证：当前开发阶段全部输出 `0.3.0`；人工制造版本不一致时测试稳定失败；不修改 IR schema。

实施记录（2026-09-02）：

- 新增 `src/version.ts` 作为运行时统一版本入口；CLI 帮助、`build.json.engineVersion` 和 build id 均改用 `HTML_PPT_VERSION`。
- 增加 `HTML_PPT_VERSION` 与 `package.json.version` 一致性回归，并在构建产物测试中校验 `engineVersion`；版本常量与包版本不一致时断言失败。
- README 的当前限制、依赖文档和风格提取文档已移除会被误读为当前项目版本的过时 `v0.1` 阶段措辞；Deck IR、Markdown 和 Theme Spec 中用于描述 schema／规范代际的 `v0.1` 保持不变。
- `npm run typecheck` 通过；非浏览器测试共 30 项，29 项通过、1 项按设计跳过。

### G2：复核并引入最小依赖

1. 重新核对 PptxGenJS 与 JSZip 的稳定版本、许可证、维护状态和 Node.js 兼容性。
2. 检查传递依赖与 PowerPoint 修复提示相关风险。
3. 选择能通过安全门禁、且不会引入第二套排版引擎的最小封装路线。
4. 锁定最终运行时依赖并更新锁文件和依赖文档。

验证：`npm ls` 无缺失或重复冲突，许可证记录完整，干净安装成功。

实施记录（2026-09-03）：

- 拒绝带有两个未修复高危审计项的 PptxGenJS 4.0.1 路线，移除 PptxGenJS 与 `image-size`。
- 最终只增加 `jszip@3.10.1` 运行时依赖，用于生成和测试 OOXML ZIP 包；依赖固定在 `package.json` 与锁文件中。
- `npm ls pptxgenjs jszip image-size --all` 只保留 JSZip，在线 `npm audit --json` 为 0 个漏洞。

### G3：实现 `exportPptxFlat()`

目标接口：

```ts
interface PptxFlatOptions {
  title: string
  language: string
  buildId: string
  slideLabels: string[]
}

export async function exportPptxFlat(
  pngFiles: string[],
  outputPath: string,
  options: PptxFlatOptions,
): Promise<number>
```

实现要求：

- 输出路径必须不存在。
- 输入 PNG 数量必须大于零，并与 label 数量一致。
- 页面尺寸、图片位置和比例必须使用本 Goal 冻结值。
- 每个页面仅创建一个图片对象，不创建文本框、形状或母版内容。
- 写入异常转换为稳定错误码并保留原错误提示。
- 成功返回实际写入的页面数。

验证：最小单页、12 页和无效输入测试通过；生成文件可被 OOXML 检查器解析。

实施记录（2026-09-03）：

- 新增 `src/pptx-flat.ts`，固定 16∶9 页面尺寸、单页单 PNG、满版 transform、替代文本、文档语言和 build id 元数据。
- 输入为空、标签数量不一致、PNG 签名／尺寸错误、目标已存在和写入失败均返回稳定错误码。
- 为兼容 PowerPoint，将 master 中的 slide layout id 修正为合法范围 `2147483649`；修正后 PowerPoint 不再提示修复。

### G4：接入 CLI、格式矩阵和原子交付

1. 扩展 CLI 参数类型、帮助文本和参数校验。
2. 将 PNG 作为 PPTX 的唯一输入；同一导出中只生成一套 PNG。
3. 实现 `pptx-flat` 与新版 `all` 格式矩阵。
4. 校验 PPTX 页数后再写 `delivery.json`。
5. 扩展交付文件列表和 PPTX 元数据。
6. 保留当前 `.partial-*` → 最终目录的原子重命名模型。

验证：四种格式的文件集合准确；失败不会出现最终目录或虚假完成标记。

实施记录（2026-09-03）：

- CLI 已支持 `pdf|png|pptx-flat|all`；`all` 复用同一组 PNG 同时生成 PDF 与 PPTX。
- `delivery.json` 按实际格式登记 PPTX 页数、模式、不可编辑标记、页面尺寸和图片尺寸；文件列表只在生成时包含 `deck.pptx`。
- 既有 `.partial-*` 工作目录与最终原子重命名语义保持不变。

### G5：补齐自动化回归

1. 更新 CLI 版本、帮助和格式测试。
2. 增加单页与 12 页 PPTX 导出测试。
3. 用 JSZip 检查 presentation、slide、relationship 和 media 部件。
4. 验证页面尺寸、页面数、单页单图和图片哈希。
5. 覆盖 PDF-only、PNG-only、PPTX-flat 和 all 四种组合。
6. 覆盖输出已存在、空 PNG 列表、数量不一致、损坏图片和写入失败。
7. 保留现有 Preflight 失败和原子目录回归。

验证：新增回归在旧实现上失败，在新实现上通过；不得通过放宽现有断言完成施工。

实施记录（2026-09-03）：

- 新增 12 页与单页 OOXML 回归，覆盖页面尺寸、slide／relationship／media 数量、单页单图、满版 transform、替代文本、应用版本和内嵌 PNG 哈希。
- 浏览器测试新增四格式矩阵，并验证 `all` 的 PPTX 文件和交付元数据。
- 当前阶段 `npm run typecheck` 通过；非浏览器测试 32 项为 31 通过、1 项按设计跳过；Chromium 浏览器测试 18 项全部通过。最终全量门禁仍在 G7 执行。

### G6：生成候选交付并执行双软件实机验收

1. 生成三主题 12 页 specimen 全格式交付。
2. 生成私有真实 27 页文稿全格式交付。
3. 优先使用独立 PPTX 渲染工具；环境不具备运行时则记录限制并执行冻结的等价验证。
4. 逐页检查 63 张页面，不以 contact sheet 代替原尺寸检查。
5. 在 PowerPoint 中打开并放映 12 页和 27 页产物。
6. 在 Keynote 中打开并放映 12 页和 27 页产物。
7. 记录应用版本、修复／转换提示、页数、比例、清晰度和视觉结论。

验证：两个软件均无修复提示；页面四边铺满、顺序一致、没有半截动画或导出残影。

阶段记录（2026-09-03）：

- 首个 12 页候选可被 Keynote 正常打开，但 PowerPoint 提示修复；定位并修正 slide layout id 后生成第二个候选。
- 修正后的 `output/goal-004-base-light-002/deck.pptx` 在 Microsoft PowerPoint 与 Apple Keynote 中均无修复或不支持提示打开，识别为 12 页；首尾页、单图 `960 × 540pt` 页面对象和放映模式检查正常。
- 独立渲染脚本因环境缺少 Python `pdf2image` 和演示渲染运行时而不可用；没有安装全局依赖。最终视觉结论将由源 PNG 原尺寸检查、PPTX 内嵌哈希一致性和双软件实机验收共同覆盖，并在交付报告中明确这一限制。
- 最终生成 `base-light`、`editorial-dark`、`cosmic-mint` 三套 12 页 specimen 和私有 27 页真实文稿，共 63 页；全部严格 Preflight 为 0 错误、0 警告，PDF 首尾页为 `960 × 540pt`，PNG 为 `2560 × 1440`。
- 四份 PPTX 的 slide／media 数量分别为 12、12、12、27；63 张内嵌 PNG 与源 PNG 的 SHA-256 全部一致。公开 specimen 的 36 页视觉基线逐页通过；真实 27 页 HTML 与 PNG 和 Goal 003 已接受、已原尺寸检查的最终产物逐字节一致。
- Microsoft PowerPoint for Mac 16.110.1（26062112）与 Apple Keynote 15.3.1（7050.1.1）均无提示打开 12 页和 27 页最终候选；页数、首尾页、缩略图顺序、单图满版对象和放映模式检查正常。

### G7：完整质量门禁与交付文档

1. 执行全部自动化命令和隔离安装。
2. 更新项目版本到 `0.4.0`，重新生成最终候选产物。
3. 完成交付报告、README、CLI、测试、依赖和架构文档。
4. 更新本 Goal 的实际任务、测试数量、产物哈希和未解决限制。
5. 同步 `ROADMAP.md` 的当前阶段、验证和发布状态。

验证：候选版本重新执行全量测试通过，最终文档不含未验证的完成声明。

实施记录（2026-09-03）：

- 项目候选版本、CLI、构建元数据、build id 和 PPTX 应用元数据统一为 `0.4.0`。
- `npm run typecheck`、32 项非浏览器测试、三主题契约、18 项浏览器回归和 4 组视觉回归全部通过；非浏览器套件为 31 通过、1 项按设计跳过。
- 隔离副本执行 `npm ci --ignore-scripts --offline` 成功并审计 0 个漏洞；类型检查、非浏览器测试和三主题契约通过，因没有私有输入和未启用本地端口为 30 通过、2 项按设计跳过。
- `git diff --check`、源码／文档私有绝对路径与高置信度密钥扫描、四份 PPTX XML／relationship 敏感信息扫描均无命中。
- 完成 `docs/delivery-goal-004.md`，并同步 README、CLI、架构、测试、依赖、本 Goal 与 Roadmap。

### G8：用户验收与工程化决策门禁

1. 向用户交付最终 HTML、PDF、PNG、PPTX 和交付报告。
2. 等待用户明确接受或提出修改意见。
3. 功能验收后形成 CI 决策：实施、暂缓或不实施。
4. 形成公开分发决策：维持源码公开个人工具，或另立 Goal 建设 LICENSE、npm 包、CHANGELOG 和 GitHub Release。
5. 将两项决策写入 `ROADMAP.md`；不得在本步骤直接修改 CI 或执行公开发布。
6. 所有完成定义满足后，将 Goal 状态更新为 `complete`。

验证：用户验收和两项后续决策都有明确记录；commit、tag、push、Release、npm publish 和部署仍标明“未执行”，除非用户另行授权。

当前决策（2026-09-03）：

- CI 暂不在本 Goal 修改。用户接受 `0.4.0` 后，可另立工程化 Goal，把无需 GUI 的类型检查、非浏览器测试、主题契约和 OOXML 测试加入 CI；浏览器与双软件实机验收继续分层处理。
- 公开分发继续维持源码公开个人工具、`private: true` 和 `UNLICENSED`。npm 分发或 GitHub Release 需要另立 Goal 补齐许可证、CHANGELOG、发布包边界和跨平台验证。
- 当前只等待用户查看并明确接受最终 PPTX；未执行 commit、tag、push、Release、npm publish 或部署。
- 实现与交付完成后连续三轮未收到用户验收结论，Goal 按状态规则更新为 `blocked`；用户回复「接受」或提供修改意见即可恢复。

完成记录（2026-09-03）：

- 用户明确回复“接受本次施工成功”，最终真实文稿 PPTX 与本次 Goal 的施工结果验收通过。
- Goal 004 的完成定义全部满足，状态由 `blocked` 更新为 `complete`。
- CI 继续暂缓，公开分发继续维持源码公开个人工具；如需建设 CI、GitHub Release 或 npm 分发，另立 Goal 并单独授权。
- 未执行 commit、tag、push、GitHub Release、npm publish 或部署。

## 8．自测清单

### 8.1 自动化命令

```bash
npm run typecheck
npm test
npm run check:themes
npm run test:browser
npm run test:visual
git diff --check
```

安装依赖后补充：

```bash
npm ls pptxgenjs jszip image-size --all
npm audit --json
```

视觉基线规则：本 Goal 不应改变 HTML 视觉。若普通 `npm run test:visual` 出现差异，必须停止并定位根因，不得直接执行 `npm run test:visual:update` 覆盖差异。

### 8.2 CLI 矩阵

| 场景 | 预期 |
|---|---|
| `--format pdf` | 有 PDF，无 PNG、PPTX |
| `--format png` | 有 PNG，无 PDF、PPTX |
| `--format pptx-flat` | 有 PNG、PPTX，无 PDF |
| `--format all` | 有 PDF、PNG、PPTX |
| 未提供 `--format` | 等价于新版 `all` |
| `--format pptx` | 返回 `CLI_FORMAT` 和退出码 2 |
| 输出目录已存在 | 返回 `OUTPUT_EXISTS`，不覆盖 |
| Preflight 失败 | 返回退出码 1，无最终目录 |
| PPTX 写入失败 | 返回退出码 1，无完成标记 |

### 8.3 OOXML 结构检查

- `[Content_Types].xml`、`ppt/presentation.xml` 和关系文件存在。
- slide XML 数量等于预期页数。
- presentation 页面尺寸为冻结的 EMU 值。
- 每页恰好存在一个图片对象和一个图片关系。
- media 图片数量、顺序和哈希与源 PNG 对应。
- 不含意外文本框、形状、外部图片 URL 或工作区绝对路径。

### 8.4 视觉与兼容性检查

- 优先用独立渲染器渲染全部页面；若当前环境不具备渲染运行时，则记录限制，并以源 PNG 原尺寸检查、内嵌图片哈希一致性和双软件实机检查共同验收。
- PowerPoint 与 Keynote 均执行打开、翻页和放映。
- 检查首页、末页、图文页、双栏页、代码页和带动效主题的静态帧。
- 检查四边铺满、清晰度、页码、背景、图片裁切和文字可读性。
- 比较 PPTX 内嵌 PNG 与 HTML 导出的 PNG，确认视觉来源一致。

### 8.5 隔离与安全检查

- 在新的临时副本执行 `npm ci --ignore-scripts` 和非浏览器质量门禁。
- 扫描交付文档、JSON、HTML 和 PPTX 解包内容中的绝对私有路径。
- 扫描高置信度密钥、token、调试标记和私有输入名称。
- 确认 `inputs-private/`、`output/`、临时渲染目录和用户应用状态均未进入 Git。

## 9．边界与异常清单

- 零页、单页、12 页和 27 页文稿。
- PNG 列表为空、文件缺失、文件损坏、尺寸错误和顺序错误。
- label 数量与 PNG 数量不一致。
- 输出目录或 `deck.pptx` 已存在。
- 路径包含空格、中文和较长文件名。
- PowerPoint 或 Keynote 提示修复、转换或不支持内容。
- PPTX 页面出现非 16∶9、图片未铺满或边缘细线。
- PNG 嵌入后被重新编码、颜色改变或清晰度下降。
- PPTX 文件较大；本 Goal 记录大小但不通过降低 PNG 分辨率换取体积。
- 动态 HTML 进入 PPTX 时只取稳定静态帧，不保留动效。
- ZIP 时间戳导致二进制不同，但结构与内容必须确定。
- `--format all` 新增 PPTX 后导出耗时和磁盘占用上升，必须在文档中明确。
- PowerPoint 与 Keynote 的应用路径不可由终端定位时，使用用户可见界面启动并记录实测，不得将“路径未找到”误判为“未安装”。

## 10．停止条件

出现以下任一情况必须停止施工并请求用户决策：

- 最新依赖调研发现许可证、维护状态或 Node.js 兼容性不满足项目要求。
- PptxGenJS 的单页单 PNG 最小文件仍触发 PowerPoint 或 Keynote 修复提示。
- 必须引入第二个 PPTX 生成器或系统级／全局依赖。
- 必须修改 Deck IR、Markdown Spec、Theme Contract 或 HTML Renderer 才能完成图片型 PPTX。
- PPTX 接入导致 HTML、PDF、PNG 或视觉基线发生非预期变化。
- 用户转而要求页面元素可编辑、动画保留或任意比例输出。
- 需要修改 CI／CD、发布配置、远端仓库或执行公开发布。

## 11．完成后的交付文档与产物

### 11.1 必须提交的公开文档

- `goals/004-pptx-flat-export.md`：施工记录、验收勾选、实际结果和最终状态。
- `docs/delivery-goal-004.md`：架构、依赖、实现、测试、兼容性、限制和发布状态。
- `README.md`：PPTX 能力、CLI 示例、不可编辑边界和格式矩阵。
- `docs/cli.md`：`pptx-flat` 与新版 `all` 的命令契约。
- `docs/architecture.md`：PPTX 派生链路和 `pptx-editable` 的继续排除。
- `docs/testing.md`：OOXML、格式矩阵、PowerPoint 与 Keynote 验收方法。
- `docs/dependencies.md`：版本、许可证、维护状态和选择理由。
- `ROADMAP.md`：Goal 状态、验证、阻塞、版本和 CI／公开分发决策。

### 11.2 本地交付产物

- `output/goal-004-<theme>-specimen-<nnn>/index.html`。
- `output/goal-004-<theme>-specimen-<nnn>/deck.pdf`。
- `output/goal-004-<theme>-specimen-<nnn>/slides/`。
- `output/goal-004-<theme>-specimen-<nnn>/deck.pptx`。
- `output/goal-004-real-deck-<nnn>/` 的 27 页完整交付。
- 每个目录中的 `build.json`、`report.json`、`delivery.json`、contact sheet 和可选主题审核页。

所有 `output/` 产物继续被 Git 忽略，不作为源文件提交。

### 11.3 交付报告必须记录

1. HTML → PNG → PPTX 的最终数据流和架构边界。
2. 版本漂移修复方式和版本一致性规则。
3. PptxGenJS／JSZip 版本、许可证、维护证据和锁文件状态。
4. CLI 四种格式的行为矩阵。
5. PPTX 页面尺寸、图片尺寸、页数、顺序和不可编辑声明。
6. OOXML 检查方法和结果。
7. 三主题 specimen 与真实 27 页文稿的产物路径、build id 和哈希。
8. PowerPoint 与 Keynote 的版本、打开、修复提示和放映结果。
9. 全部自动化测试命令、数量、通过／失败／跳过结果。
10. 全页渲染与逐页视觉检查结论。
11. 已知限制、性能和文件体积记录。
12. 隔离安装、敏感信息和私有路径扫描结果。
13. CI 与公开分发的决策结论或明确的后续 Goal。
14. Git 状态；未获授权的 commit、tag、push、Release、npm publish 和部署必须写“未执行”。

## 12．Goal 状态维护

- `planned`：施工清单已完成，用户尚未明确要求开始实施。
- `active`：用户明确要求实施，启动条件满足，至少一个施工阶段进行中。
- `blocked`：同一阻塞条件反复出现，且无法在现有授权和环境中继续推进。
- `complete`：G0～G8、完成定义、双软件兼容性、交付文档、用户验收和后续决策记录全部满足。

每次状态变化必须同步本文件和 `ROADMAP.md`。完成代码但没有执行完整验证、没有通过 PowerPoint／Keynote 实机验收、没有用户明确接受或没有记录 CI／公开分发决策时，均不得标记为 `complete`。
