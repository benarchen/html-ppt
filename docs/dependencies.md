# 依赖说明

## 运行基线

- 生产兼容基线：Node.js 24 LTS。
- 开发验证环境：Node.js 26 Current、npm 11.12.1。
- `package.json` 允许 Node.js `>=24 <27`。

Node.js 官方在 2026-08-30 将 v24 标记为 LTS、v26 标记为 Current。Playwright 官方当前支持 Node.js 22、24 和 26。

## 运行依赖

| 依赖 | 版本 | 用途 | 许可证 | 选择理由 |
|---|---:|---|---|---|
| `unified` | 11.0.5 | AST 处理管线 | MIT | remark 官方核心处理器，无重复依赖 |
| `remark-parse` | 11.0.0 | CommonMark 解析 | MIT | 官方 Markdown Parser |
| `remark-frontmatter` | 5.0.0 | frontmatter AST | MIT | 与 remark AST 原生集成 |
| `remark-gfm` | 4.0.1 | GFM 表格等语法 | MIT | 官方 GFM 扩展 |
| `remark-directive` | 4.0.0 | metric directive | MIT | 避免自建 Markdown tokenizer |
| `yaml` | 2.9.0 | YAML 1.2 解析 | ISC | 无运行依赖，支持错误与文档模型 |
| `jszip` | 3.10.1 | 生成图片型 PPTX 的 OOXML ZIP 包，并在测试中独立解包检查 | MIT 或 GPL-3.0-or-later，本项目按 MIT 使用 | 只负责 ZIP 容器，不引入第二套排版引擎；官方仓库仍以 3.10.1 为当前版本并持续维护测试配置 |

## 开发依赖

| 依赖 | 版本 | 用途 | 许可证 | 选择理由 |
|---|---:|---|---|---|
| `typescript` | 7.0.2 | 严格类型检查和编译 | Apache-2.0 | 官方编译器 |
| `@types/node` | 24.13.3 | Node.js 24 类型 | MIT | 与生产兼容基线一致 |
| `@playwright/test` | 1.62.1 | Chromium、导出与视觉回归 | Apache-2.0 | 官方浏览器自动化与快照工具 |
| `pdfjs-dist` | 6.3.289 | 测试中检查 PDF 页数和尺寸 | Apache-2.0 | Mozilla 官方实现，持续维护 |

## 排除项

- 不引入 React、Vite 或模板框架：当前使用 TypeScript 生成静态 HTML，降低输出运行时依赖。
- 不引入第三方 CLI Parser：当前参数规模可以用标准库实现。
- 不引入 `pdf-lib`：npm 包最后发布时间为 2022 年，不满足本项目维护性要求。
- 不引入图片处理库：图片尺寸由浏览器原生能力检查。
- 不引入 PptxGenJS：4.0.1 会间接引入 `image-size@1.2.1`，施工时 `npm audit` 报告两个没有可用修复版本的高危拒绝服务漏洞；本项目所需的单页单 PNG 封装可以用 JSZip 和最小 OOXML 直接完成。

既有依赖信息在 2026-08-30 通过 npm registry 与各项目官方资料核对；JSZip 与被排除的 PptxGenJS 在 2026-09-03 再次通过官方 GitHub 仓库、包清单和 release 记录核对。JSZip 官方仓库声明当前版本为 3.10.1，采用 MIT 或 GPLv3 双许可证；本项目选择 MIT 条款。

## 依赖门禁结论

- 标准库足以承担 CLI 参数、文件、HTTP 预览、路径和哈希处理；因此这些能力没有引入额外包。
- 每个第三方依赖都直接服务于 Markdown AST、YAML、TypeScript、Chromium 导出、PDF 验收或视觉回归，没有为假设中的未来能力加包。
- 所选项目在核验日仍有维护活动、可用发布记录和公开 issue 跟踪；锁文件固定了本次验证版本。
- 所有依赖许可证均为 MIT、ISC 或 Apache-2.0；项目自有内容为 `UNLICENSED`，两者不冲突。
- 没有同时引入同类 CLI、Markdown、浏览器或 PDF 实现；`pdfjs-dist` 仅在测试中解析 PDF，不进入生产导出链路。
- `npm ls pptxgenjs jszip image-size --all` 只保留 `jszip@3.10.1`，没有 PptxGenJS 或 `image-size`；2026-09-03 的在线 `npm audit --json` 为 0 个漏洞。

## PPTX 依赖决策

图片型 PPTX 采用“JSZip＋项目内最小 OOXML 模板”路线：HTML 先由 Chromium 输出 `2560 × 1440` PNG，封装器只创建 presentation、master、blank layout、slide、relationship、theme 和 media 部件。页面布局仍完全来自 HTML，不在 PPTX 层建立第二套布局模型。

PptxGenJS 4.0.1 的能力和 MIT 许可证本身满足候选要求，但其传递依赖在施工时不能通过项目安全门禁，因此未进入最终依赖树。JSZip 3.10.1 的 npm 版本发布较早，维护风险通过以下边界控制：固定版本、仅处理项目自产 PNG、生成结构由 OOXML 回归测试覆盖，并同时在 PowerPoint 与 Keynote 中实机打开验证。
