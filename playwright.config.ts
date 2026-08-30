import os from "node:os"
import path from "node:path"
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  outputDir: path.join(os.tmpdir(), "html-ppt-playwright-results"),
  snapshotPathTemplate: "{testDir}/snapshots/{testFilePath}/{arg}{ext}",
  use: {
    browserName: "chromium",
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  },
})
