# Goal 005 交付报告：跨平台命令与最小 CI

## 1．当前结论

Goal 005 已完成实现、双平台 CI、用户验收和远端版本收尾，`v0.5.0` 是当前稳定版本及最新公开标签。浏览器安装、浏览器回归和视觉回归现在通过 Node.js 入口设置环境，不再要求用户使用 POSIX 的 `VAR=value command` 语法。

最小 GitHub Actions CI 已配置 Ubuntu／Windows、Node.js 24 LTS 核心矩阵，并已在施工分支完成真实验证。范围内实现、最终本地门禁和隔离安装均已完成；用户于 2026-09-04 明确接受最终结果，Goal 状态更新为 `complete`。

## 2．跨平台命令设计

- `scripts/run-playwright.mjs` 使用 `import.meta.resolve()` 定位项目内 Playwright CLI，并通过子进程环境设置 `PLAYWRIGHT_BROWSERS_PATH`。
- `scripts/run-node-tests.mjs` 使用 Node.js `glob()` 生成核心测试文件列表，避免依赖 shell 展开测试路径。
- `scripts/run-browser-tests.mjs` 使用 Node.js `glob()` 获取明确的测试文件列表，不依赖 Bash、zsh、cmd.exe 或 PowerShell 展开通配符。
- `HTML_PPT_NETWORK_TESTS` 由 Node.js 包装入口传递，`npm run test:browser` 在各平台保持相同语义。
- `npm run browser:install` 取代文档中的平台专用安装写法。
- CLI 的 `build`、`preview`、`export`、`check` 和参数契约没有改变。

没有引入 `cross-env` 或其他新依赖；标准库和现有 Playwright 依赖已经足够。

## 3．最小 CI

workflow：`.github/workflows/ci.yml`。

触发条件：

- 推送到 `main` 或 `goal-*` 分支。
- 面向 `main` 的 Pull Request。
- `workflow_dispatch` 手工触发。

核心矩阵：

| Runner | Node.js | 命令 |
|---|---:|---|
| `ubuntu-latest` | 24 | `npm ci --ignore-scripts`、类型检查、非浏览器测试、主题契约 |
| `windows-latest` | 24 | `npm ci --ignore-scripts`、类型检查、非浏览器测试、主题契约 |

`npm test` 包含图片型 PPTX 的 OOXML 结构、单图关系、媒体哈希和失败边界回归，因此不需要在核心 CI 安装 PowerPoint、Keynote 或 Chromium。

## 4．CI 安全边界

- workflow 顶层只授予 `contents: read`。
- checkout 设置 `persist-credentials: false`。
- 不使用 Secrets，不请求写权限，不上传构建产物。
- 不执行 commit、push、Release、npm publish 或部署。
- 同一 workflow／分支的旧运行由 concurrency 策略取消。
- CI 不执行 `test:visual:update`。

GitHub 官方说明推荐使用 `setup-node` 配置 Node.js，支持通过 `permissions` 限定令牌权限，并指出只有完整提交 SHA 是不可变的 Action 引用。因此两个官方 Action 均固定到经官方 tag API 核对的完整 SHA：

- `actions/checkout@6.0.2`：`de0fac2e4500dabe0009e67214ff5f5447ce83dd`。
- `actions/setup-node@7.0.0`：`820762786026740c76f36085b0efc47a31fe5020`。

参考：

- https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://github.com/actions/checkout/releases/tag/v6.0.2
- https://github.com/actions/setup-node/releases/tag/v7.0.0

## 5．验证分层

- 核心 CI：Ubuntu／Windows 的类型、非浏览器功能、路径和主题契约。
- 固定发布环境：Chromium Preflight、PDF／PNG／PPTX 导出和视觉回归。
- 人工实机：PowerPoint 与 Keynote 打开、页序、比例和放映。

Windows CI 验证路径分隔符和 Node.js 子进程行为；空格和中文路径由跨平台集成测试覆盖。视觉截图不在 Windows 比较，避免系统字体和渲染差异产生伪回归。

首轮远端 CI `33779200028` 中，Ubuntu 核心 job 全部通过；Windows job 在非浏览器测试发现 CLI 入口的手工 `file://` URL 比较不兼容 Windows 路径，并发现参考 SVG 因 checkout 换行转换导致字节哈希变化。候选修复改用 `pathToFileURL()` 判断 CLI 主模块，并用 `.gitattributes` 保持主题参考证据的仓库字节。

第二轮远端 CI `33779665251` 全部通过：

| Job | Hosted 环境 | 结果 | 用时 |
|---|---|---|---:|
| Ubuntu core | `ubuntu-latest`／Node.js 24 | 安装、类型检查、34 项非浏览器测试、三主题契约通过 | 17 秒 |
| Windows core | Windows Server 2025／Node.js 24.19.0 | 安装、类型检查、34 项非浏览器测试、三主题契约通过 | 46 秒 |

运行证据：https://github.com/benarchen/html-ppt/actions/runs/33779665251

## 6．本地候选验证

施工前基线：类型检查通过；32 项非浏览器测试为 31 通过、1 项按设计跳过；三主题契约、18 项浏览器回归和 4 组视觉回归全部通过。

跨平台入口实现后：

- 类型检查通过。
- 34 项非浏览器测试为 33 通过、1 项按设计跳过。
- 三主题契约通过。
- 20 项浏览器回归全部通过。
- 4 组视觉回归全部通过，未更新视觉基线。
- Playwright 包装入口输出项目锁定版本 `1.62.1`。

候选版本更新为 `0.5.0` 后已重新执行最终门禁：类型检查、三主题契约、20 项浏览器回归和 4 组视觉回归全部通过；34 项非浏览器测试为 33 通过、1 项按设计跳过。Ubuntu／Windows CI 结果将在分支推送后补充。

从提交 `90b2414` 创建的隔离副本完成离线 `npm ci --ignore-scripts`，安装 111 个包并审计 0 漏洞；类型检查、三主题契约和 34 项非浏览器测试通过。隔离环境没有本地预览网络开关和私有输入，因此 32 项通过、2 项按设计跳过。

## 7．边界与未完成项

- Windows 浏览器导出、视觉截图和 PowerPoint 实机兼容不属于最小 CI 的承诺范围。
- CI 不访问私有真实文稿，因此对应测试按设计跳过。
- GitHub-hosted runner 的具体镜像内容由 GitHub 维护；项目只冻结 Node.js 主版本和 Action 完整 SHA。
- 当前尚未完成用户最终验收。
- 验收提交 `dae5cc9` 已快进合并到 `main`，注解标签 `v0.5.0` 指向同一提交，本地与远端引用已经核对一致。
- 未执行 GitHub Release、npm publish 或部署。

## 8．验收状态

Goal 005 当前为 `complete`。用户验收、`main` 合并、`v0.5.0` 标签和远端同步均已完成；GitHub Release、npm publish 和部署仍不在本 Goal 范围内。
