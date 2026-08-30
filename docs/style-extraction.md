# 参考图风格提取规范

## 输入记录

每次提取必须记录参考图文件名、内容哈希、来源、授权状态、提取日期和操作者。未确认授权的 logo、字体和图片不能进入主题资产。

## Style Spec

提取结果至少覆盖：

1. 色彩角色。
2. 字体层级和回退字体。
3. 间距、栅格和内容密度。
4. 圆角、描边、阴影和容器形态。
5. 对齐、留白和视觉动线。
6. 图片裁切、滤镜和蒙版。
7. 图形、图标、标签和装饰语言。
8. 图表色板、坐标轴和标注。
9. 明确的禁止规则。

每类结论必须带 `high`、`medium` 或 `low` 置信度。无法从参考图确定的信息进入 `unresolved`，不得伪装成事实。

## 工作流

1. 将参考图放入目标主题 `references/` 并记录哈希。
2. 生成结构化 Style Spec，区分观察事实与设计推断。
3. 从 `themes/_template/` 建立主题包。
4. 完成 token、组件和全部标准布局。
5. 渲染 specimen 和缩略图总览。
6. 通过导出产物中的 `theme-review.html` 同时检查参考图、Style Spec、Manifest、token 和全部页面。
7. 通过审核后锁定主题版本；修改视觉系统必须提升主题版本并重跑基线。

## 演练边界

v0.1 只交付提取协议、模板与一次无专有素材的演练。自动识别字体、抓取外部资产和复制第三方品牌不属于本阶段。

## 模板与演练

- `themes/_template/style-spec.json`：Style Spec 标准模板。
- `themes/_template/README.md`：主题制作和验收步骤。
- `themes/editorial-dark/references/reference.svg`：项目自有的演练参考图。
- `themes/editorial-dark/style-spec.json`：带来源、授权、哈希、置信度和待确认项的演练结果。

当正式主题包含 `style-spec.json` 且执行 PNG 导出时，工具会生成 `theme-review.html`。该文件离线嵌入参考图，并集中展示 Style Spec、Theme Manifest、token 和全部页面缩略图。
