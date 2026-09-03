---
id: "goal-005"
name: "跨平台命令与最小 CI"
status: "active"
created: "2026-09-03"
target: "v0.5.0"
depends_on: "goal-004"
source: "v0.4.0-post-release-project-health-review"
---

# Goal 005：跨平台命令与最小 CI 施工清单

## 1．目标

在不改变 Markdown → Deck IR → HTML → PDF／PNG／图片型 PPTX 产品链路的前提下，消除公开文档和 npm scripts 对 POSIX 环境变量语法的隐式依赖，并建立覆盖核心质量门禁的最小 GitHub Actions CI。

本 Goal 完成后，项目应具备：

- macOS、Linux 和 Windows 可执行的安装、检查、测试和导出命令契约。
- Pull Request 与 `main` 分支提交自动触发的核心质量门禁。
- 不依赖 PowerPoint、Keynote 或桌面 GUI 的 CI 验证层。
- 浏览器／视觉回归与 PowerPoint／Keynote 实机验收的清晰分层。

## 2．阶段决策

下一阶段冻结为“跨平台命令与最小 CI”，原因是它直接决定公开仓库后续开发的可重复验证能力，应先于新增产品能力处理。

本阶段优先级为：

1. 修正跨平台命令入口。
2. 建立 Node.js 24 LTS 核心 CI。
3. 增加 Windows 非浏览器验证。
4. 明确浏览器、视觉回归和双软件实机验收的分层策略。

以下方向继续延后：

- GitHub Release、npm publish、公开部署和许可证切换。
- 可编辑 PPTX Renderer。
- 新主题、新布局和新的 Markdown 语法。

## 3．范围

### 3.1 包含

- 盘点 README、CLI、测试文档和 npm scripts 中的 POSIX 专用环境变量写法。
- 建立不依赖 shell 方言的浏览器路径和测试环境入口。
- 保持现有 CLI 参数、产物结构和错误码兼容。
- 在 macOS／Linux 与 Windows 上验证非浏览器命令。
- 建立最小 GitHub Actions workflow。
- CI 使用 Node.js 24 LTS 执行干净安装、类型检查、非浏览器测试和主题契约检查。
- 确认 `npm test` 覆盖图片型 PPTX OOXML 结构与失败边界。
- 根据运行成本决定 Chromium 与视觉回归属于必跑 job、独立 job 或人工发布门禁，并记录理由。
- 更新 README、CLI、测试说明、依赖说明、交付报告和 Roadmap。

### 3.2 不包含

- 修改 Markdown Spec、Deck IR、Planner、Theme Contract 或 HTML Renderer。
- 改变 HTML、PDF、PNG、PPTX 的视觉和产物契约。
- 在 CI 中启动 Microsoft PowerPoint 或 Apple Keynote。
- 在 CI 中访问私有真实 Markdown、用户参考图或 `inputs-private/`。
- GitHub Release、npm publish、部署、域名或其他公开发布操作。
- 项目许可证决策。
- 可编辑 PPTX、新主题和新布局。
- 安装全局依赖或修改开发者系统配置。

## 4．启动条件与执行门禁

- [x] Goal 004 已完成并发布为 `v0.4.0`。
- [x] 项目体检已确认跨平台命令和 CI 是下一阶段优先事项。
- [x] 本施工清单已冻结范围、边界、验收、自测和交付要求。
- [x] 用户明确要求开始实施 Goal 005。
- [x] 用户在实施前单独确认允许修改 CI 配置。

两个启动门禁已于 2026-09-03 满足，Goal 状态更新为 `active`。用户同时授权在本 Goal 范围内创建本地提交、推送 `goal-005-cross-platform-ci` 分支并根据 CI 结果迭代；合并、标签和正式发布仍以完成验证与用户验收为前提。

## 5．设计约束

### 5.1 跨平台命令

- 优先使用 Node.js 标准库或已有 Playwright 配置传递环境状态。
- 如果标准库与现有依赖足以解决，不得引入 `cross-env` 等新依赖。
- 若确需新增依赖，实施前必须记录用途、许可证、维护状态和替代方案。
- README 中声明支持的平台，必须有对应命令或验证证据。
- shell 专用示例必须明确标注适用平台，不得伪装成通用命令。

### 5.2 CI 分层

- 核心 CI 不得依赖私有输入、PowerPoint、Keynote、用户凭据或本机字体。
- Node.js 24 LTS 是最低必测版本；Node.js 26 只在维护成本允许时作为补充。
- Windows 至少执行类型检查、非浏览器测试和主题契约检查。
- Chromium 与视觉回归必须使用项目锁定的 Playwright 版本和显式缓存策略。
- CI 不得自动更新视觉基线。
- CI 不得发布包、创建 Release、写回仓库或使用生产密钥。

## 6．施工任务

### G0：冻结基线

1. 将 Goal 状态更新为 `active`，同步 Roadmap。
2. 记录分支、提交、Node.js、npm 和现有质量门禁结果。
3. 记录 macOS／Linux 与 Windows 当前命令差异。

验证：施工前工作树和既有测试状态清楚，未修改 CI。

实施记录（2026-09-03）：

- 基线为 `main@71f862d`，施工分支为 `goal-005-cross-platform-ci`；Node.js 为 `26.0.0`，npm 为 `11.12.1`。
- 施工前类型检查通过；32 项非浏览器测试为 31 通过、1 项按设计跳过；三主题契约、18 项浏览器回归和 4 组视觉回归全部通过。
- 基线工作树只包含用户要求的 `v0.4.0` 文档校准和本 Goal 规划文档，没有代码、依赖或 CI 修改。

### G1：修正跨平台命令入口

1. 识别 `PLAYWRIGHT_BROWSERS_PATH=0`、`HTML_PPT_NETWORK_TESTS=1` 等 shell 绑定点。
2. 使用跨平台入口替代 npm scripts 中的 POSIX 专用写法。
3. 更新 README、CLI 和测试文档中的安装、导出、检查和测试示例。
4. 保持项目内 Chromium 与网络测试开关的既有语义。

验证：macOS／Linux 与 Windows 使用同一 npm script 契约，不要求用户手工改写环境变量语法。

实施记录（2026-09-03）：

- 新增 `scripts/run-playwright.mjs`，通过 Node.js 设置项目内浏览器路径并直接调用 Playwright CLI。
- 新增 `scripts/run-node-tests.mjs` 和 `scripts/run-browser-tests.mjs`，使用 `node:fs/promises` 的 `glob()` 展开测试文件；核心与浏览器测试都不依赖 shell 展开通配符，浏览器入口通过 `spawnSync()` 显式传递环境。
- `test`、`browser:install`、`test:browser`、`test:visual` 和 `test:visual:update` 不再包含 POSIX 内联环境变量赋值或测试文件通配符展开依赖。
- README 与 CLI／测试文档统一使用跨平台 npm scripts；路径回归扩展为空格和中文目录。
- 未引入 `cross-env` 或其他新 npm 依赖。

### G2：建立核心 CI

1. 在获得明确授权后创建最小 GitHub Actions workflow。
2. 对 Pull Request 和 `main` 分支提交执行 Node.js 24 LTS 核心门禁。
3. 使用锁文件干净安装。
4. 执行类型检查、非浏览器测试和三主题契约检查。
5. 设置合理超时、最小权限和并发取消策略。

验证：故意制造类型、测试或主题契约错误时，对应 job 返回失败；恢复后通过。

实施记录（2026-09-03，远端结果待补）：

- 已创建 `.github/workflows/ci.yml`，触发范围为 `main`、`goal-*` 分支、面向 `main` 的 Pull Request 和手工触发。
- 核心矩阵冻结为 Ubuntu／Windows 与 Node.js 24 LTS，依次执行 `npm ci --ignore-scripts`、类型检查、非浏览器测试和三主题契约。
- workflow 权限为 `contents: read`，checkout 禁止持久化凭据，不使用 Secrets，不写回、不发布、不部署；并发策略会取消同一分支的过期运行。
- `actions/checkout@6.0.2` 与 `actions/setup-node@7.0.0` 按 GitHub 安全建议固定到官方 tag 对应的完整提交 SHA。

### G3：增加 Windows 验证

1. 在 Windows runner 执行依赖安装和核心门禁。
2. 验证路径分隔符、空格路径、中文路径和 CLI 退出码。
3. 验证不依赖 Bash、zsh 或 POSIX 环境变量赋值。

验证：Windows 核心 job 稳定通过，失败日志不暴露绝对私有路径或凭据。

### G4：浏览器与视觉回归分层

1. 评估 Chromium 安装时间、缓存体积和视觉差异稳定性。
2. 冻结浏览器测试与视觉回归的触发策略。
3. 保留 PowerPoint／Keynote 为发布前人工实机验收，不伪装成 CI 能力。
4. 确认 CI 永不自动执行 `test:visual:update`。

验证：自动化层和人工验收层边界写入测试文档，触发条件可复现。

实施记录（2026-09-03）：

- 最小 CI 只承担确定性的核心门禁和 OOXML 回归，不安装 Chromium，避免浏览器安装成本和跨平台字体差异进入核心矩阵。
- Chromium 与视觉回归继续作为固定发布环境门禁；视觉基线只允许人工显式更新。
- PowerPoint 与 Keynote 继续作为发布前人工实机验收，不声称被 CI 覆盖。

### G5：收尾与交付

1. 执行完整自测和隔离安装。
2. 检查 workflow 最小权限、第三方 Action 固定方式和日志内容。
3. 更新 README、相关长期文档、本 Goal、交付报告和 Roadmap。
4. 等待用户验收后再将状态更新为 `complete`。

验证：文档与实际 workflow、平台矩阵和测试命令一致；未执行任何公开发布。

实施记录（2026-09-03，本地候选）：

- 开发候选版本已统一更新为 `0.5.0`，`package.json`、锁文件和运行时版本入口保持一致。
- 最终本地门禁已重跑：类型检查、三主题契约、20 项浏览器回归和 4 组视觉回归全部通过；34 项非浏览器测试为 33 通过、1 项按设计跳过。
- 视觉回归未更新基线；未执行 GitHub Release、npm publish、部署、合并或标签操作。
- 隔离安装、施工分支推送、Ubuntu／Windows 真实 CI 和用户最终验收仍待完成。

## 7．完成定义与验收标准

### 7.1 跨平台

- [ ] README 声明的每个支持平台都有实际验证证据。
- [x] npm scripts 不依赖只在 POSIX shell 生效的内联环境变量赋值。
- [ ] 安装、类型检查、非浏览器测试、主题检查和公开示例构建在支持平台可执行。
- [ ] 空格路径、中文路径和 Windows 路径分隔符具有回归覆盖。

### 7.2 CI

- [ ] Pull Request 和 `main` 提交能够触发核心 CI。
- [ ] CI 至少覆盖 Node.js 24 LTS、类型检查、非浏览器测试和主题契约。
- [ ] 图片型 PPTX OOXML 测试进入核心 CI。
- [x] CI 使用最小权限，不包含发布、写回或生产凭据。
- [x] 视觉基线只能人工显式更新。
- [x] PowerPoint／Keynote 继续标记为人工验收，不声称已被 CI 覆盖。

### 7.3 无回归

- [x] Markdown、Deck IR、Theme Contract 和 CLI 参数契约没有非预期变化。
- [x] HTML、PDF、PNG 和图片型 PPTX 的既有测试全部通过。
- [x] 三主题视觉基线没有非预期变化。
- [x] 本地用户无需 CI 才能正常构建和导出。

### 7.4 文档与收尾

- [ ] Goal 005 施工记录和交付报告完整。
- [ ] README、CLI、测试说明和 Roadmap 与实际平台支持一致。
- [ ] 用户明确接受最终结果。
- [ ] GitHub Release、npm publish、部署、许可证和可编辑 PPTX 仍明确排除。

## 8．自测清单

### 8.1 核心命令

```bash
npm run typecheck
npm test
npm run check:themes
```

### 8.2 浏览器与视觉命令

```bash
npm run test:browser
npm run test:visual
```

普通验证不得执行 `npm run test:visual:update`。

### 8.3 平台矩阵

| 平台 | Node.js | 必测内容 |
|---|---:|---|
| Ubuntu | 24 LTS | 安装、类型检查、非浏览器测试、主题契约 |
| Windows | 24 LTS | 安装、类型检查、非浏览器测试、主题契约、路径回归 |
| macOS | 24 LTS 或项目开发版本 | 完整本地门禁、Chromium、视觉回归 |

### 8.4 安全与仓库检查

```bash
git diff --check
git status --short
```

- 检查 workflow 权限、日志、缓存和 Action 固定方式。
- 检查 `.env*`、私有输入、输出产物和凭据没有进入 Git。
- 检查 CI 没有写回、发布或部署步骤。

## 9．边界与异常清单

- Windows npm 默认 shell 不识别 POSIX 环境变量赋值。
- 路径包含空格、中文、反斜杠和盘符。
- Playwright 浏览器缺失、缓存失效或版本不一致。
- CI 无私有真实 Markdown 和本地视觉基线。
- GitHub Actions 临时网络失败与真实测试失败需要可区分。
- Windows 和 Linux 字体差异不得误判为产品视觉回归。
- fork PR 不应获得写权限或项目凭据。
- CI 超时、并发重复和缓存污染。
- 第三方 Action 版本漂移或供应链风险。

## 10．停止条件

出现以下任一情况必须停止实施并请求用户决策：

- 必须修改 CI 配置但尚未得到明确授权。
- 必须新增依赖且维护状态、许可证或必要性尚未确认。
- Windows 支持要求修改 Deck IR、Theme Contract 或渲染结果。
- CI 接入导致现有 HTML 或视觉基线发生非预期变化。
- 需要访问私有输入、用户凭据、PowerPoint 或 Keynote。
- 需要执行 GitHub Release、npm publish、部署或其他公开发布。

## 11．完成后的交付文档

- `goals/005-cross-platform-ci.md`：施工记录、验收勾选和最终状态。
- `docs/delivery-goal-005.md`：跨平台方案、CI 架构、验证矩阵、风险和限制。
- `README.md`：经过验证的平台、安装和命令入口。
- `docs/cli.md`：跨平台 CLI 调用方式。
- `docs/testing.md`：本地、CI、浏览器、视觉和实机验收分层。
- `docs/dependencies.md`：如有新增依赖，记录版本、许可证和维护性决策。
- `ROADMAP.md`：阶段、实际验证、阻塞和后续方向。
- 经单独授权创建的 `.github/workflows/` 文件。

## 12．Goal 状态维护

- `planned`：施工清单已建立，尚未获得开始实施和修改 CI 的明确授权。
- `active`：两个启动门禁均满足，施工已开始。
- `blocked`：同一阻塞条件连续出现且无法继续推进。
- `complete`：范围内实现、平台验证、CI、文档和用户验收全部完成。

每次状态变化都必须同步 `ROADMAP.md`。没有 Windows 验证、没有 CI 实际运行证据、没有用户验收时，不得标记为 `complete`。
