import { spawnSync } from "node:child_process"
import { glob } from "node:fs/promises"

const files = []
for (const pattern of ["build/tests/browser/*.test.js", "build/tests/integration/*.test.js"]) {
  for await (const file of glob(pattern)) files.push(file)
}
files.sort()

const result = spawnSync(process.execPath, [
  "--test",
  ...files,
], {
  env: {
    ...process.env,
    HTML_PPT_NETWORK_TESTS: "1",
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? "0",
  },
  stdio: "inherit",
})

if (result.error) throw result.error
process.exitCode = result.status ?? 1
