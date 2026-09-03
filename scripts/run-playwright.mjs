import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const cli = fileURLToPath(import.meta.resolve("@playwright/test/cli"))
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? "0",
  },
  stdio: "inherit",
})

if (result.error) throw result.error
process.exitCode = result.status ?? 1
