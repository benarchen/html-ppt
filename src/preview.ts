import { watch, type FSWatcher } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"
import { compileDeck } from "./build.js"

export interface PreviewOptions {
  projectRoot: string
  inputPath: string
  themeName?: string
  port: number
  signal?: AbortSignal
  onListening?: (url: string) => void
}

export async function startPreview(options: PreviewOptions): Promise<void> {
  let compiled = await compileDeck(options)
  let currentHtml = compiled.html
  let lastError = ""
  let rebuilding = false

  const rebuild = async (): Promise<void> => {
    if (rebuilding) return
    rebuilding = true
    try {
      compiled = await compileDeck(options)
      currentHtml = compiled.html
      lastError = ""
      process.stdout.write(`预览已重建：${new Date().toLocaleTimeString()}\n`)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      process.stderr.write(`预览重建失败：${lastError}\n`)
    } finally {
      rebuilding = false
    }
  }

  const server = createServer((request, response) => {
    if (request.method !== "GET" || (request.url !== "/" && request.url !== "/index.html")) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
      response.end("Not found")
      return
    }
    if (lastError) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" })
      response.end(`Build failed:\n${lastError}`)
      return
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" })
    response.end(currentHtml)
  })

  const watchers: FSWatcher[] = []
  let timer: NodeJS.Timeout | undefined
  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void rebuild(), 120)
  }
  watchers.push(watch(options.inputPath, schedule))
  watchers.push(watch(path.join(options.projectRoot, "themes", compiled.theme.manifest.name), { recursive: true }, schedule))

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(options.port, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address ? address.port : options.port
      const url = `http://127.0.0.1:${port}`
      process.stdout.write(`预览地址：${url}\n`)
      options.onListening?.(url)
    })
    const stop = (): void => {
      for (const watcher of watchers) watcher.close()
      server.close(() => resolve())
    }
    process.once("SIGINT", stop)
    process.once("SIGTERM", stop)
    options.signal?.addEventListener("abort", stop, { once: true })
  })
}
