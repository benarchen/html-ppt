# 私有参考图说明

`reference.png` 是 Goal 002 的用户参考图，仅限本地分析，因此被 `.gitignore` 排除。

`feedback-motion.png` 是用户第一轮审核时提供的带标注截图，用于确认银河、星空、右侧缓慢转动的地球和右上区域流星动效。红框标注和直播界面本身不属于主题。

`feedback-earth-01.png`、`feedback-earth-02.png` 和 `feedback-earth-03.png` 是用户第二轮审核提供的连续地球参考帧，用于确认“仅陆地使用细小点阵、海洋留空”和缓慢转动方向。`feedback-galaxy.png` 与 `feedback-meteors.png` 分别用于确认颗粒化斜向银河和两条细流星的形态。这五张文件同样仅限本地分析，并由 `.gitignore` 排除。

本地审核所需文件属性：

- 路径：`themes/cosmic-mint/references/reference.png`。
- 格式：PNG。
- 尺寸：2118 × 1112。
- SHA-256：`09ab258c06ae0d02c7a37e43b04e60ef8c90b6fa8317835b255beb77d9b611fa`。

审核反馈文件属性：

- 路径：`themes/cosmic-mint/references/feedback-motion.png`。
- 格式：PNG。
- 尺寸：1668 × 854。
- SHA-256：`5c962c87bb1b617dae19af9848b5a95fc669c6696458d29dc664f82a0b33a676`。

第二轮细化参考文件属性：

- `feedback-earth-01.png`：1222 × 1348，SHA-256 为 `9748ac7e52fcd20ee74cabcc3e5dcbe516b87ba121dd70e31c728d4fe99b6101`。
- `feedback-earth-02.png`：1208 × 1300，SHA-256 为 `0ea60b36106219a2341cbdf3ffa3b551051300b15ec35cc779f63fff45f8d4b4`。
- `feedback-earth-03.png`：1218 × 1304，SHA-256 为 `79f5408215c9d1170297e31e5a43f38c345f2735c98422fe111e02c2eb5b4f99`。
- `feedback-galaxy.png`：3334 × 1694，SHA-256 为 `01a433cd3ec2138ae6ead3d197c1f10dbec42ad086703cb804fd3f34c4d89a0b`。
- `feedback-meteors.png`：1122 × 778，SHA-256 为 `86723fe2db5c9962535fa7c03a8c2b9fe75b7f965d30b04a964f9861839b10a6`。

文件不存在时，主题本身仍可构建，但不能生成带原图的 `theme-review.html`。
