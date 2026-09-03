import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { parse } from "yaml"

const root = process.cwd()

test("浏览器相关 npm scripts 不依赖 POSIX 内联环境变量", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as { scripts: Record<string, string> }
  for (const name of ["browser:install", "test:browser", "test:visual", "test:visual:update"]) {
    const command = packageJson.scripts[name]
    assert.ok(command, `缺少 npm script：${name}`)
    assert.doesNotMatch(command, /(?:^|&&\s+)[A-Z][A-Z0-9_]*=/, `${name} 仍包含 POSIX 环境变量赋值`)
  }
})

test("最小 CI 使用只读权限、固定 Action 和 Ubuntu／Windows 矩阵", async () => {
  const source = await readFile(path.join(root, ".github", "workflows", "ci.yml"), "utf8")
  const workflow = parse(source) as {
    permissions: Record<string, string>
    jobs: { core: { strategy: { matrix: { os: string[] } }; steps: Array<{ uses?: string; run?: string }> } }
  }
  assert.deepEqual(workflow.permissions, { contents: "read" })
  assert.deepEqual(workflow.jobs.core.strategy.matrix.os, ["ubuntu-latest", "windows-latest"])
  const uses = workflow.jobs.core.steps.flatMap((step) => step.uses ? [step.uses] : [])
  assert.equal(uses.length, 2)
  for (const action of uses) assert.match(action, /^[\w-]+\/[\w-]+@[0-9a-f]{40}$/)
  const commands = workflow.jobs.core.steps.flatMap((step) => step.run ? [step.run] : [])
  assert.deepEqual(commands, [
    "npm ci --ignore-scripts",
    "npm run typecheck",
    "npm test",
    "npm run check:themes",
  ])
  assert.doesNotMatch(source, /pull_request_target|permissions:\s*(?:write-all|{})|npm publish|git push/i)
})
