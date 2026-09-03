---
name: "html-ppt 项目规范"
description: "Markdown 驱动、HTML 优先的演示文稿生成项目协作规范"
---

# 项目目标

本项目用于将 Markdown 内容转换为多风格演示文稿。HTML 是唯一视觉真相源，PDF、PNG 和高保真图片型 PPTX 均为派生输出。

# 核心约束

- 内容、结构、视觉和导出必须分层，禁止将 Markdown 直接耦合到具体主题 CSS。
- Markdown 必须先转换为稳定的 Deck IR，再进入布局和渲染流程。
- 主题必须以可版本化的 Theme Package 存储，不得只保存临时 CSS。
- HTML 渲染结果是视觉验收基准；PDF 和 PNG 必须从同一 HTML 生成。
- 不得默认承诺任意 HTML 到可编辑 PPTX 的无损转换。
- 未实现且未验证的能力不得写入已完成状态。

# 目录约定

- `docs/`：架构、Markdown 规范、主题规范等长期文档。
- `goals/`：可执行的阶段目标、施工清单、验收标准和完成记录。
- `src/`：解析、模型、布局、渲染、检查和导出代码。
- `themes/`：主题包及主题验收样张。
- `examples/`：可运行的示例文稿。
- `tests/`：单元测试、契约测试和视觉回归测试。
- `scripts/`：不依赖 shell 方言的跨平台项目命令入口。
- `.github/workflows/`：经授权维护的最小持续集成配置，不得包含发布或部署步骤。
- `output/`：本地生成产物，禁止纳入版本管理或作为源文件修改。

# 文档维护

- 架构决策写入 `docs/`。
- 施工目标写入 `goals/`；每份 Goal 必须包含范围、边界、任务、验收、自测和交付物。
- 项目介绍和使用方式写入 `README.md`。
- 当前阶段、已完成、待办、阻塞和最近验证写入 `ROADMAP.md`。
- 每次完成开发、修复或重要文档补充后同步更新 `ROADMAP.md`。

# 验证命令

```bash
npm run typecheck
npm test
npm run check:themes
npm run test:browser
npm run test:visual
```

浏览器相关命令使用项目内 Chromium。受限沙箱中需要允许启动浏览器和绑定本地回环端口。

视觉基线只能通过显式命令更新：

```bash
npm run test:visual:update
```

普通测试不得覆盖视觉基线。更新基线前必须先检查差异原因，更新后立即执行普通 `npm run test:visual`。

# 构建规则

- 所有输出写入新的 `output/` 子目录，禁止覆盖已有目录。
- PDF、PNG 和图片型 PPTX 导出前必须通过 Preflight。
- `ERROR` 必须返回非零退出码；严格模式会把 `WARN` 升级为错误。
- 主题必须通过 `npm run check:themes` 并覆盖全部 12 种标准布局。
- 图片型 PPTX 已进入 `v0.4.0` 默认完整导出工作流；最小 CI 在 Goal 005 中实施，可编辑 PPTX、GitHub Release、npm publish 和部署仍属于独立后续工作。
