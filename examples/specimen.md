---
title: html-ppt 主题验收样张
theme: base-light
ratio: 16:9
language: zh-CN
---

<!-- slide: cover -->

# 从 Markdown 到视觉系统

HTML 是唯一视觉真相源

---

<!-- slide: section -->

# 01 架构与内容

先建立语义，再决定表达。

---

# 稳定的生成管线

- Markdown 负责内容输入
- Deck IR 负责语义结构
- Theme Package 负责视觉系统
- HTML Renderer 负责最终呈现

---

# 内容与视觉分离

## 内容层

- 标题与正文
- 数据与图片
- 页面叙事类型

## 视觉层

- 排版与颜色
- 栅格与间距
- 图片与图表语言

---

<!-- slide: image -->

# 图像与文字共同叙事

![抽象网格示例图](assets/sample.svg)

图片经过主题统一裁切和处理，内容本身不携带具体样式。

---

<!-- slide: metrics -->

# 核心指标

:::metric{value="12" label="标准布局"}
:::

:::metric{value="2" label="基础主题"}
:::

:::metric{value="100%" label="HTML 优先"}
:::

:::metric{value="16:9" label="固定画布"}
:::

---

<!-- slide: comparison -->

# 两种生成方式

## 直接拼接

- 内容与 CSS 耦合
- 难以切换主题
- 导出结果不稳定

## 结构化生成

- Deck IR 保持语义
- 主题可以替换
- 输出能够验证

---

<!-- slide: timeline -->

# 一条可验证的流水线

1. 解析 Markdown
2. 校验 Deck IR
3. 匹配布局
4. 渲染 HTML
5. 执行 Preflight

---

<!-- slide: quote -->

# 设计原则

> 同一份内容应该能够切换风格，而不需要重写结构。

---

<!-- slide: chart -->

# 页面能力覆盖

| 模块 | 覆盖率 |
|---|---:|
| Parser | 92 |
| Theme | 86 |
| Renderer | 96 |
| Export | 88 |

---

<!-- slide: full-bleed-image -->

# 视觉可以大胆，结构必须稳定

![抽象网格示例图](assets/sample.svg)

主题决定视觉语气，Deck IR 保持内容秩序。

---

<!-- slide: ending -->

# 从一份 Markdown 开始

构建、检查、导出。
