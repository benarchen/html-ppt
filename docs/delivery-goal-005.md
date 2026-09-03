# Goal 005 交付报告：跨平台命令与最小 CI

## 1．当前结论

Goal 005 已完成本地候选实现，开发候选版本为 `0.5.0`。浏览器安装、浏览器回归和视觉回归现在通过 Node.js 入口设置环境，不再要求用户使用 POSIX 的 `VAR=value command` 语法。

最小 GitHub Actions CI 已配置 Ubuntu／Windows、Node.js 24 LTS 核心矩阵。本报告当前等待施工分支推送后的真实 CI 结果；在 Windows job、最终自测和用户验收完成前，Goal 保持 `active`。

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

## 7．边界与未完成项

- Windows 浏览器导出、视觉截图和 PowerPoint 实机兼容不属于最小 CI 的承诺范围。
- CI 不访问私有真实文稿，因此对应测试按设计跳过。
- GitHub-hosted runner 的具体镜像内容由 GitHub 维护；项目只冻结 Node.js 主版本和 Action 完整 SHA。
- 当前尚未完成 Windows 真实 job、隔离安装和用户验收。
- 当前尚未合并到 `main`，未创建 `v0.5.0` 标签，未执行 GitHub Release、npm publish 或部署。

## 8．验收状态

Goal 005 当前为 `active`。施工分支 CI 全部通过、最终文档同步并获得用户明确接受后，才可以更新为 `complete` 并进入合并与标签流程。
