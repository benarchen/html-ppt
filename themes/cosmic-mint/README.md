# Cosmic Mint 主题

`cosmic-mint` 是从用户参考图提取并经用户验收的深色宇宙主题，当前版本为 `0.1.2`。它使用薄荷青作主强调、冷白文字作主要内容，并以颗粒化斜向银河、分层星空、右侧陆地点阵地球和双流星构成识别性背景。

## 适用场景

- AI、工程、技术培训和未来感主题。
- 需要明确标题层级与少量高亮的演示文稿。
- 深色环境下的现场展示和屏幕录制。

## 设计边界

- 不复制参考图的栅格背景、平台 UI、直播评论或品牌元素。
- 银河和地球由主题自有的代码生成 SVG 重建，不嵌入参考图背景；构建时 SVG 会内联到 CSS，最终 HTML 保持自包含。
- 地球只在陆地区域使用细小点阵，海洋保持深色留空，并以 48 秒纹理漂移表现缓慢转动。
- 两条细流星使用 5.8～7.6 秒的不同周期和延迟形成非同步运动。
- 打印和 `prefers-reduced-motion` 环境会冻结为稳定静态帧，保证 PDF、PNG 与无动画预览仍有完整视觉元素。
- 参考图与用户反馈图仅限本地分析，`references/reference.png` 和 `references/feedback-*.png` 被 Git 忽略，不得公开推送。
- 图表和摄影规则属于低置信度设计延伸；地球与流星动效由用户书面反馈确认。

## 验证

```bash
npm run check:themes
PLAYWRIGHT_BROWSERS_PATH=0 npm run html-ppt -- check themes/cosmic-mint/specimen.md \
  --theme cosmic-mint --strict --output output/cosmic-mint-specimen-check
```

执行 PNG 导出时，本地参考图会被嵌入 `theme-review.html`，便于将原图、Style Spec、Manifest、token 和全部页面并排审核。动态速度与地球纹理变化必须在 `index.html` 中复核，PDF、PNG 和审核页只展示稳定静态帧。
