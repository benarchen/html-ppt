import { spawnSync } from "node:child_process"
import { glob } from "node:fs/promises"

const files = []
for (const pattern of ["build/tests/unit/*.test.js", "build/tests/integration/*.test.js"]) {
  for await (const file of glob(pattern)) files.push(file)
}
files.sort()

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
})

if (result.error) throw result.error
process.exitCode = result.status ?? 1
