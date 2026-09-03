# Goal 004 交付报告：高保真图片型 PPTX

## 1．交付结论

Goal 004 已完成代码、自动化、候选产物、用户验收和远端发布，`v0.4.0` 是当前稳定版本及最新公开标签。同一份 Markdown 现在可以沿既有 HTML 主链路生成 HTML、PDF、PNG 和图片型 PPTX：

```text
Markdown
  → Deck IR
  → Planned Deck IR
  → HTML
  → Preflight
  → 2560 × 1440 PNG
  → pptx-flat
```

HTML 仍是唯一视觉真相源。PPTX 每页只有一个满版 PNG 对象，不在 OOXML 层重新排版；视觉与 HTML 派生 PNG 一致，但页面内文字、图表、表格和形状不可编辑。

代码与候选产物已通过 Microsoft PowerPoint 和 Apple Keynote 实机验证。用户于 2026-09-03 明确接受本次施工结果，Goal 004 已更新为 `complete`。实现提交 `005473c` 和注解标签 `v0.4.0` 已通过 SSH 推送到公开 GitHub 仓库；未执行 GitHub Release、npm publish 或部署。

## 2．版本漂移修复

- `src/version.ts` 是运行时统一版本入口。
- CLI 帮助、build id、`build.json.engineVersion` 和 PPTX `AppVersion` 均使用同一版本常量。
- 自动化测试比较运行时版本与 `package.json.version`；不一致时测试失败。
- Goal 004 发布时的 `package.json`、锁文件和运行时元数据统一为 `0.4.0`。
- Deck IR、Markdown 和 Theme Spec 的 schema 版本没有改变。

## 3．依赖决策

最终只增加 `jszip@3.10.1` 运行时依赖，用于创建和测试 OOXML ZIP 包。JSZip 官方仓库仍将 3.10.1 标为当前版本，许可证为 MIT 或 GPLv3 双许可，本项目按 MIT 使用。

施工中曾复核 `pptxgenjs@4.0.1`。它会间接引入 `image-size@1.2.1`，在线 `npm audit` 报告两个没有可用修复版本的高危拒绝服务漏洞。项目没有接受漏洞，也没有执行跨主版本的 `npm audit fix --force`；PptxGenJS 与 `image-size` 已从最终依赖树移除。

最终结果：

- `npm ls pptxgenjs jszip image-size --all` 只保留 `jszip@3.10.1`。
- 在线 `npm audit --json` 为 0 个漏洞。
- JSZip 只负责 ZIP 容器；页面内容和布局仍完全来自 HTML 派生 PNG。

参考：

- https://github.com/Stuk/jszip
- https://github.com/Stuk/jszip/blob/main/LICENSE.markdown
- https://github.com/gitbrent/PptxGenJS/releases

## 4．实现与交付契约

`exportPptxFlat()` 固定以下契约：

- 页面尺寸：`12192000 × 6858000 EMU`，对应 `13.333333 × 7.5in`。
- 图片尺寸：`2560 × 1440`。
- 每页一个 `<p:pic>`，位置 `x=0`、`y=0`，尺寸等于整个页面。
- PNG 原字节写入 OOXML media，不裁切、不重编码。
- 图片替代文本包含页码和 slide id。
- 文档元数据记录标题、语言、build id、`flat` 和 `editable:false`。
- 空输入、数量不一致、无效 PNG、尺寸错误、目标已存在和写入失败均返回稳定错误码。

PowerPoint 首个候选曾出现修复提示。根因是 slide master 中的 layout id 不在 PowerPoint 接受的有效范围；修正为 `2147483649` 后重新生成候选，PowerPoint 与 Keynote 均不再提示修复或不支持内容。

## 5．CLI 格式矩阵

| `--format` | PDF | PNG／contact sheet | PPTX | 说明 |
|---|---:|---:|---:|---|
| `pdf` | 是 | 否 | 否 | 保持原行为 |
| `png` | 否 | 是 | 否 | 保持原行为 |
| `pptx-flat` | 否 | 是 | 是 | PNG 是 PPTX 的审计来源，因此保留 |
| `all` 或省略 | 是 | 是 | 是 | `0.4.0` 起的默认完整交付 |

`delivery.json` 在实际生成 PPTX 时增加 `pptxPages`、`pptxMode: "flat"`、`pptxEditable: false`、`pptxSize` 和 `pptxImageSize`，并在 `files` 中登记 `deck.pptx`。没有生成 PPTX 的格式不会伪造这些字段。

导出继续使用 `.partial-*` 工作目录；只有 Preflight、PDF、PNG、PPTX 和完成标记全部成功后，才原子重命名为最终目录。

## 6．最终候选产物

| 产物 | 页数 | build id | PPTX 大小 | PPTX SHA-256 |
|---|---:|---|---:|---|
| `output/goal-004-base-light-specimen-001/` | 12 | `71ca089ee33fb66c` | 2,888,444 B | `5e5f9fb8665e5c2bc12806d77dd97fd04a1dc157e8b46787b41673271cdf86a3` |
| `output/goal-004-editorial-dark-specimen-001/` | 12 | `5f32431570a1cdad` | 3,001,523 B | `92c24fe456f8ab3a9d70153489e7583625d16b3eff57a671f602bee5d1bf00b0` |
| `output/goal-004-cosmic-mint-specimen-001/` | 12 | `eeb6e42fa86b98af` | 19,384,685 B | `61055d12fef44f887db9d99fe88b4e4c24da6783dda90cbf49bc56a2818553bf` |
| `output/goal-004-real-deck-001/` | 27 | `8146395fc08cd485` | 45,559,123 B | `344243f930b3837eb2afacb1f5a957192f40d5b673e79d25fc84e9342b9c4627` |

四个目录均包含 `index.html`、Deck IR、Planned Deck IR、`build.json`、`report.json`、`delivery.json`、`deck.pdf`、`deck.pptx`、`slides/` 和 contact sheet；`cosmic-mint` 目录还包含主题审核页。所有严格 Preflight 结果均为 0 错误、0 警告。

四份 PDF 分别为 12、12、12、27 页，首尾页均为 `960 × 540pt`。四份 PPTX 分别含 12、12、12、27 个 slide XML 和等量 media PNG；63 张内嵌图片与对应 `slides/` 源文件的 SHA-256 全部一致。

私有 27 页候选的 `index.html` 与 Goal 003 已接受并完成原尺寸检查的最终 HTML 字节完全一致，27 张 PNG 也逐页字节一致。三套公开 specimen 的 36 个页面在本次 `npm run test:visual` 中逐页与既有视觉基线比较通过，因此本 Goal 没有引入 HTML 视觉变化。

## 7．PowerPoint 与 Keynote 实机验收

验收环境：

- Microsoft PowerPoint for Mac 16.110.1（26062112）。
- Apple Keynote 15.3.1（7050.1.1）。

验收结果：

- 修正后的 12 页 `base-light` 候选在两个软件中均无修复、转换或不支持提示。
- 真实 27 页 `cosmic-mint` 候选在两个软件中均无修复、转换或不支持提示。
- 两个软件均识别正确页数；首页、末页、缩略图顺序和放映模式检查正常。
- Keynote 将每页识别为一个 `960 × 540pt`、水平和垂直居中的图片对象。
- 页面内容保持 16∶9，应用编辑区和非 16∶9 显示窗口产生的外围区域不属于幻灯片内容。

当前环境提供的独立 PPTX 渲染脚本依赖 Python `pdf2image` 或额外演示渲染运行时，均未安装。项目没有为此安装全局依赖，也不声称完成独立渲染器验证；视觉正确性由 63 张 HTML 派生 PNG、36 页公开视觉基线、27 页已接受产物的字节等价、63 张内嵌图片哈希一致和双软件实机验收共同覆盖。

## 8．自动化与隔离验证

| 检查 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm test` | 32 项：31 通过，1 项按设计跳过 |
| `npm run check:themes` | 3 个主题、每个 12 种布局全部通过 |
| `npm run test:browser` | 18 项全部通过 |
| `npm run test:visual` | 4 组全部通过，未更新视觉基线 |
| `git diff --check` | 通过 |
| 源码与文档私有绝对路径／高置信度密钥扫描 | 无命中 |
| 四份 PPTX XML／relationship 敏感信息扫描 | 无命中 |

隔离副本不复用当前 `node_modules/`、`build/`、`output/` 和私有输入，执行 `npm ci --ignore-scripts --offline` 成功并审计 0 个漏洞；类型检查、32 项非浏览器测试和三主题契约通过。隔离测试因没有私有输入和未启用本地端口，30 项通过、2 项按设计跳过。

## 9．边界与已知限制

- PPTX 是不可编辑的图片页，不承诺任意 HTML 到原生 PowerPoint 对象的转换。
- HTML 动画、随机流星、星光、地球转动、页面切换和交互不会进入 PPTX；PPTX 使用导出模式的稳定静态帧。
- 当前只支持固定 16∶9 和 `2560 × 1440` 页面图片。
- 图片不重编码，因此复杂主题和 27 页文稿的 PPTX 文件体积明显高于基础主题；本 Goal 不通过降低分辨率换取体积。
- 没有演讲者备注、视频、音频和 HTML 链接交互的完整迁移。
- `pptx-editable` 仍未实现，也不是本 Goal 的承诺能力。

## 10．CI 与公开分发决策

- CI：本 Goal 不修改 CI／CD。建议在用户接受 `0.4.0` 后另立工程化 Goal，把无需 GUI 的类型检查、非浏览器测试、主题契约和 OOXML 测试加入 CI；浏览器与双软件实机验收仍分层处理。
- 公开分发：当前继续维持“源码公开、个人工具、`private: true`、`UNLICENSED`”状态。若要 npm 分发或 GitHub Release，必须另立 Goal 补齐项目许可证、CHANGELOG、发布包边界和跨平台验证。
- 本次未修改 CI 配置，未执行 GitHub Release、npm publish 或部署。用户授权后，已创建实现提交 `005473c` 和注解标签 `v0.4.0`，并通过 SSH 推送 `main` 与标签。

## 11．验收状态

实现、自动化、候选产物和 PowerPoint／Keynote 兼容性验收已经完成。用户于 2026-09-03 明确回复“接受本次施工成功”，Goal 004 状态已更新为 `complete`。实现提交 `005473c`、注解标签 `v0.4.0`、`main` 与标签均已同步到远端。
