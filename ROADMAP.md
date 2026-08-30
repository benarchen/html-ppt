# Roadmap

## 当前阶段

v0.1 MVP 已完成：Goal 001 全量验收与交付完成；本地 Git 基线已建立，GitHub 发布待处理。

## 已完成

- 建立项目级 `AGENTS.md`。
- 建立完整 `README.md`、输入／IR／主题／风格提取／CLI／测试／依赖和交付文档。
- 建立 HTML 优先的演示文稿生成架构文档。
- 完成 Markdown → Deck IR → Planner → HTML 的确定性主链路。
- 支持 GFM、任务状态、本地图片、表格、代码和 `metric` directive，并限制输入大小、节点数、深度、原始 HTML 和危险资源。
- 完成 `base-light` 与 `editorial-dark` 双主题、统一 Theme Contract、12 种布局和 Style Spec 演练主题。
- 完成本地预览、热重载、PDF／PNG 导出、contact sheet 和主题审核页。
- 完成 Preflight、严格模式、原子导出、运行时元数据和交付完成标记。
- 完成单元、契约、集成、真实浏览器和双主题 24 张视觉基线测试。
- 完成 `goals/001-v0.1-mvp.md` 的 G0～G9、最终质量门禁和交付记录。
- 将项目初始化为以 `main` 为默认分支的 Git 仓库，并以本次提交作为 `0.1.0` 本地项目基线。

## 进行中

- `v0.1.0` 标签、公开 GitHub 仓库和远端推送等待风险确认及 GitHub CLI 重新认证。

## 待办

- 使用用户提供且授权明确的真实参考图执行下一套 Theme Package 提取与审核。
- 根据真实文稿反馈扩展 Block、布局预算和拆页策略。
- 评估高保真不可编辑 PPTX 与有限可编辑 PPTX 两种输出模式；不属于 v0.1 已完成功能。

## 阻塞

暂无。

## 最近验证

- 2026-08-30：隔离副本 `/tmp/html-ppt-release-clean.gMJu3E` 执行 `npm ci --ignore-scripts`、类型检查、26 项非浏览器测试和双主题契约检查通过；非浏览器套件为 25 通过、1 项按设计跳过。
- 2026-08-30：`npm run test:browser` 12 项全部通过，覆盖 Chromium、PDF／PNG、Preflight 错误矩阵、缩放、原子导出和预览热重载。
- 2026-08-30：`npm run test:visual` 2 项全部通过，对应双主题 24 张布局截图，差异阈值为 `0.001`。
- 2026-08-30：`output/delivery-base-v0.1/` 与 `output/delivery-dark-v0.1/` 均完成 12 页 HTML、PDF 和 PNG 导出；PDF 为 `960 × 540 pt`，PNG 为 `2560 × 1440`，Preflight 为 0 错误、0 警告。
- 2026-08-30：两个主题的严格检查均为 12 页、0 错误、0 警告；本地链接、空白、绝对路径、密钥模式、调试标记和临时导出目录扫描通过。
- 2026-08-30：v0.1 功能验收时尚未初始化 Git，已执行 85 文件尾随空白扫描；随后按用户要求初始化 `main` 分支，本次提交作为 `0.1.0` 本地项目基线。
