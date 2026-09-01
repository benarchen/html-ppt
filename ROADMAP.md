# Roadmap

## 当前阶段

v0.2.0 已发布到公开 GitHub 仓库：Goal 002 与 `cosmic-mint` 0.1.2 已验收，项目版本为 `0.2.0`，发布提交和注解标签 `v0.2.0` 已通过 SSH 推送。

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
- 创建注解标签 `v0.1.0`，并推送到公开仓库 https://github.com/benarchen/html-ppt 。
- 本地 `main` 已关联 `origin/main`，GitHub 默认分支为 `main`。
- 建立 `goals/002-reference-theme-real-deck.md`，冻结参考图主题提取与真实文稿闭环的范围、验收、自测、边界和交付要求。
- 从用户参考图提取 `cosmic-mint` 0.1.0 Style Spec，完成第三套正式 Theme Package、12 种标准布局和公开视觉基线。
- 完成私有真实文稿的来源快照、4 章／17 概念内容映射、27 页派生演示稿与双主题语义一致性验证。
- 完成 `cosmic-mint` specimen 和真实文稿的严格 Preflight、HTML／PDF／PNG／contact sheet／主题审核页导出及逐页视觉自检。
- 修复 Style Spec 主题审核页已生成但未通用登记到 `delivery.json` 的问题，并补充 CLI 浏览器回归测试。
- 完成 Goal 002 隔离安装、确定性构建、敏感路径扫描和交付报告。
- 根据用户第一轮视觉审核，将银河、分层星空、右侧点阵地球和流星提升为主题核心语法，并归档仅限本地的带标注审核证据。
- 完成 `cosmic-mint` 0.1.1：48 秒地球缓慢纹理转动、三组 9.4～13.1 秒非同步流星周期，以及打印／减少动态效果静态降级。
- 新增真实浏览器动效回归，重新执行 12 页 specimen 与 27 页真实文稿严格 Preflight、全格式导出、逐页检查和视觉基线更新。
- 记录用户对 0.1.1 的拒绝及五张第二轮细化参考；参考图仅限本地、哈希可追溯并由 Git 忽略。
- 完成 `cosmic-mint` 0.1.2：地球仅在陆地绘制细小点阵，海洋留空；银河改为确定性颗粒星带；流星改为两条 5.8～7.6 秒的细线动效。
- 补齐主题本地视觉资产内联，允许的图片与 SVG 在构建时转换为 Data URL，最终 HTML 保持自包含；新增单元和浏览器回归。
- 完成 0.1.2 的 12 页 specimen 与 27 页真实文稿严格 Preflight、全格式导出、contact sheet 和 27 页原尺寸人工检查，并显式更新视觉基线。
- 用户于 2026-08-31 明确接受 `cosmic-mint` 0.1.2，Goal 002 完成定义全部满足，状态更新为 `complete`。
- 创建发布提交 `2857a73` 和注解标签 `v0.2.0`，并通过 SSH 推送 `main` 与标签到公开仓库。

## 进行中

无。输入与派生真实内容继续仅限本地处理，不提交或推送到公开仓库。

## 待办

- 如需 GitHub Release、npm publish 或部署，另行确认发布范围与内容。
- 评估高保真不可编辑 PPTX 与有限可编辑 PPTX 两种输出模式；不属于 v0.1 已完成功能。

## 阻塞

无。

## 最近验证

- 2026-08-30：隔离副本 `/tmp/html-ppt-release-clean.gMJu3E` 执行 `npm ci --ignore-scripts`、类型检查、26 项非浏览器测试和双主题契约检查通过；非浏览器套件为 25 通过、1 项按设计跳过。
- 2026-08-30：`npm run test:browser` 12 项全部通过，覆盖 Chromium、PDF／PNG、Preflight 错误矩阵、缩放、原子导出和预览热重载。
- 2026-08-30：`npm run test:visual` 2 项全部通过，对应双主题 24 张布局截图，差异阈值为 `0.001`。
- 2026-08-30：`output/delivery-base-v0.1/` 与 `output/delivery-dark-v0.1/` 均完成 12 页 HTML、PDF 和 PNG 导出；PDF 为 `960 × 540 pt`，PNG 为 `2560 × 1440`，Preflight 为 0 错误、0 警告。
- 2026-08-30：两个主题的严格检查均为 12 页、0 错误、0 警告；本地链接、空白、绝对路径、密钥模式、调试标记和临时导出目录扫描通过。
- 2026-08-30：v0.1 功能验收时尚未初始化 Git，已执行 85 文件尾随空白扫描；随后按用户要求初始化 `main` 分支，本次提交作为 `0.1.0` 本地项目基线。
- 2026-08-30：创建基线提交 `ef98318` 和注解标签 `v0.1.0`；创建公开 GitHub 仓库 `benarchen/html-ppt`，推送 `main` 与标签，并确认本地分支跟踪 `origin/main`。
- 2026-08-31：只读检查真实 Markdown，共 249 行、17,020 字节、4 个二级章节和 17 个三级概念；确认其没有项目 frontmatter，且文章分隔与内容密度需要来源快照、内容映射和派生演示 Markdown。
- 2026-08-31：建立 Goal 002 施工清单；尚未复制参考图或桌面原文，尚未修改主题、代码、测试和视觉基线。
- 2026-08-31：Goal 002 开始施工；记录基线 `main@c9c2532`、Node.js 26.0.0、npm 11.12.1，类型检查、26 项非浏览器测试和两个现有主题契约检查通过。
- 2026-08-31：桌面原文施工前 SHA-256 为 `bfde026a488ca9aa8abb50a9cd42c008a88d6aa00fb2a1d278e1c1178537c3fc`；直接解析稳定返回 `META_REQUIRED`，源文件未修改。
- 2026-08-31：私有来源快照与桌面原文 SHA-256 一致；内容映射覆盖 4／4 个章节和 17／17 个三级概念，没有新增外部事实。
- 2026-08-31：27 页派生演示 Markdown 通过 Parser、Deck IR 和 `base-light` 严格 Preflight，结果为 0 错误、0 警告。
- 2026-08-31：`output/goal-002-content-export-003/` 完成 27 页 HTML、PDF 和 PNG 导出；PDF 为 `960 × 540 pt`（13.333in × 7.5in），PNG 全部为 `2560 × 1440`，build id 为 `bec7a8ece960e68d`。
- 2026-08-31：从匹配的本地对话剪贴板缓存归档原始参考 PNG，尺寸为 2118 × 1112，SHA-256 为 `09ab258c06ae0d02c7a37e43b04e60ef8c90b6fa8317835b255beb77d9b611fa`；文件仅限本地且被 Git 忽略。
- 2026-08-31：完成 `cosmic-mint` 0.1.0 Theme Package 与 Style Spec；实现自评 24／30，三项关键评分均不低于 4，用户最终审核待完成。
- 2026-08-31：新主题 specimen 严格 Preflight 为 12 页、0 错误、0 警告；真实文稿新主题严格 Preflight 为 27 页、0 错误、0 警告。
- 2026-08-31：`output/goal-002-delivery-cosmic-002/` 完成 27 页全格式交付，build id 为 `a93d21524f2ef9ae`；PDF 为 960 × 540 pt，27 张 PNG 均为 2560 × 1440，交付清单包含 contact sheet 和主题审核页。
- 2026-08-31：新主题 12 张公开视觉基线和真实文稿 7 张本地私有代表页基线经人工审核后建立；`npm run test:visual` 4 项全部通过，既有 24 张基线未变化。
- 2026-08-31：`npm run typecheck`、28 项非浏览器测试、三主题契约检查通过；完整浏览器套件 13 项通过，交付清单修复后的定向浏览器回归 4 项通过。
- 2026-08-31：隔离副本 `/private/tmp/html-ppt-goal002-clean.tjKq2j/` 执行 `npm ci --ignore-scripts`、类型检查、非浏览器测试和三主题契约检查通过；私有输入测试在干净副本按设计跳过。
- 2026-08-31：连续两次构建的 HTML、Deck IR、Planned Deck IR 与 build id 完全一致；桌面原文施工后 SHA-256 仍为 `bfde026a488ca9aa8abb50a9cd42c008a88d6aa00fb2a1d278e1c1178537c3fc`。
- 2026-08-31：用户第一轮审核指出初版背景缺少明确银河／星空／地球，并补充右上区域存在随机流星动效；审核截图为 1668 × 854，SHA-256 为 `5c962c87bb1b617dae19af9848b5a95fc669c6696458d29dc664f82a0b33a676`，仅本地归档。
- 2026-08-31：`cosmic-mint` 升级到 0.1.1；动效定向浏览器回归 5 项通过，主题契约与 28 项非浏览器测试通过。
- 2026-08-31：修订版 specimen 严格 Preflight 为 12 页、0 错误、0 警告；真实文稿严格 Preflight 为 27 页、0 错误、0 警告。
- 2026-08-31：`output/goal-002-delivery-cosmic-003/` 完成 27 页修订版全格式导出，build id 为 `767df95d919bdfb4`，PDF SHA-256 为 `c5c0917a88efdf401b27fe96a21f2b4d4e2a9293e11ce84ad1a8ca103a41e4cf`。
- 2026-08-31：修订版 contact sheet 与 27 张逐页 PNG 已人工检查；视觉差异仅出现在 `cosmic-mint` 和本地私有真实文稿，显式更新后 `npm run test:visual` 4 项全部通过。
- 2026-08-31：修订版最终 `npm run test:browser` 14 项全部通过，包含地球转动、流星非同步周期和减少动态效果静态降级回归。
- 2026-08-31：用户明确拒绝 0.1.1 的地球点阵与背景表现，并补充三张地球帧、一张银河图和一张双流星图；五张证据仅限本地归档，尺寸与 SHA-256 已写入 Style Spec。
- 2026-08-31：`cosmic-mint` 升级到 0.1.2；新增 `dotted-earth-strip.svg` 与 `galaxy-field.svg`，主题加载器将本地视觉资产内联为 Data URL，主题契约和 29 项非浏览器测试通过。
- 2026-08-31：0.1.2 specimen 严格 Preflight 为 12 页、0 错误、0 警告；真实文稿严格 Preflight 为 27 页、0 错误、0 警告。
- 2026-08-31：`output/goal-002-delivery-cosmic-004/` 完成 27 页全格式导出，build id 为 `524e4ab29f047c4e`，PDF SHA-256 为 `97ee6357cc749d50785f002c8c029a6175fb53278f4968537db51b4e98e58783`；27 张 PNG 均为 2560 × 1440。
- 2026-08-31：0.1.2 contact sheet 与 27 张原尺寸 PNG 已人工检查，无重叠、越界、裁切或异常换行；预期视觉差异经确认并显式更新后，`npm run test:visual` 4 项全部通过。
- 2026-08-31：0.1.2 最终 `npm run test:browser` 14 项全部通过，包含 SVG 资产内联、地球纹理变化、双流星非同步周期和静态降级回归；敏感绝对路径与密钥模式扫描无命中。
- 2026-08-31：用户明确接受 `cosmic-mint` 0.1.2；Goal 002 完成定义全部满足，Goal 文件、交付报告和 Roadmap 同步为 `complete`。未执行 commit、push、tag、Release 或公开发布。
- 2026-09-01：项目版本更新为 `0.2.0`；发布前 `npm run typecheck`、29 项非浏览器测试、三主题契约、14 项浏览器测试和 4 组视觉回归全部通过，提交、标签与远端同步待执行。
- 2026-09-01：创建发布提交 `2857a73`（`feat: 完成 Goal 002 参考图主题与真实文稿闭环`）和注解标签 `v0.2.0`；通过 SSH 将 `main` 与标签推送到 `origin`。未创建 GitHub Release、未执行 npm publish 或部署。
