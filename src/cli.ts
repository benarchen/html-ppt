#!/usr/bin/env node
import { rename, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { checkThemeSpecimens, compileDeck, recordBrowserMetadata, writeBuild } from "./build.js"
import { HtmlPptError, formatError } from "./errors.js"
import { exportContactSheet, exportPdf, exportPng, exportThemeReview } from "./exporter.js"
import { parseMarkdownFile } from "./parser.js"
import { exportPptxFlat } from "./pptx-flat.js"
import { assertPreflight, runPreflight } from "./preflight.js"
import { startPreview } from "./preview.js"
import { isInside } from "./utils.js"
import { HTML_PPT_VERSION } from "./version.js"

type Command = "build" | "preview" | "export" | "check" | "inspect-ir" | "check-themes"

interface Arguments {
  command?: Command
  input?: string
  theme?: string
  output?: string
  format?: "pdf" | "png" | "pptx-flat" | "all"
  port: number
  strict: boolean
  help: boolean
  logLevel: "quiet" | "normal" | "verbose"
}

const HELP = `html-ppt v${HTML_PPT_VERSION}

用法：
  html-ppt build <deck.md> [--theme <name>] [--output <dir>] [--log-level quiet|normal|verbose]
  html-ppt preview <deck.md> [--theme <name>] [--port <number>] [--log-level quiet|normal|verbose]
  html-ppt export <deck.md> [--theme <name>] [--format pdf|png|pptx-flat|all] [--output <dir>] [--log-level quiet|normal|verbose]
  html-ppt check <deck.md> [--theme <name>] [--strict] [--output <dir>] [--log-level quiet|normal|verbose]
  html-ppt inspect-ir <deck.md>
  html-ppt check-themes

约束：输出目录必须位于当前项目内，且不能预先存在。
`

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const args = parseArguments(argv)
    if (args.help || !args.command) {
      process.stdout.write(HELP)
      return 0
    }
    const projectRoot = process.cwd()
    if (args.command === "check-themes") {
      const specimens = await checkThemeSpecimens(projectRoot)
      log(args, `主题契约通过：${specimens.map((item) => `${item.theme}（${item.slideCount} 页）`).join(", ")}\n`)
      return 0
    }

    const inputPath = requireInput(args, projectRoot)
    if (args.command === "inspect-ir") {
      const deck = await parseMarkdownFile(inputPath, projectRoot)
      process.stdout.write(`${JSON.stringify(deck, null, 2)}\n`)
      return 0
    }
    if (args.command === "preview") {
      await startPreview({ projectRoot, inputPath, ...(args.theme ? { themeName: args.theme } : {}), port: args.port })
      return 0
    }

    const compiled = await compileDeck({ projectRoot, inputPath, ...(args.theme ? { themeName: args.theme } : {}) })
    const suffix = args.command === "build" ? "" : `-${args.command}`
    const output = resolveOutput(projectRoot, args.output ?? path.join("output", `${path.basename(inputPath, path.extname(inputPath))}-${compiled.theme.manifest.name}${suffix}`))
    if (args.command === "build") {
      const build = await writeBuild(compiled, output, projectRoot)
      log(args, `HTML 构建完成：${build.htmlPath}\n`)
      verbose(args, `buildId=${compiled.buildId} theme=${compiled.theme.manifest.name} slides=${compiled.plannedDeck.slides.length}\n`)
      return 0
    }

    const finalOutput = output
    const workingOutput = args.command === "export" ? `${finalOutput}.partial-${process.pid}-${Date.now()}` : finalOutput
    if (args.command === "export") await assertTargetMissing(finalOutput)
    const build = await writeBuild(compiled, workingOutput, projectRoot)

    const report = await runPreflight(build.htmlPath, compiled.theme.manifest, {
      strict: args.command === "check" && args.strict,
      reportPath: path.join(build.outputDirectory, "report.json"),
    })
    await recordBrowserMetadata(build.metadataPath, report.runtime)
    printReport(report, args)
    assertPreflight(report)

    if (args.command === "check") return 0
    const format = args.format ?? "all"
    const expectedPages = compiled.plannedDeck.slides.length
    let pdfPages: number | undefined
    let pngPages: number | undefined
    let pptxPages: number | undefined
    let themeReviewPath: string | undefined
    if (format === "pdf" || format === "all") {
      pdfPages = await exportPdf(build.htmlPath, path.join(build.outputDirectory, "deck.pdf"))
      if (pdfPages !== expectedPages) throw new HtmlPptError("EXPORT_PAGE_COUNT", `PDF 页数 ${pdfPages} 与 HTML 页数 ${expectedPages} 不一致`)
    }
    if (format === "png" || format === "pptx-flat" || format === "all") {
      const pngFiles = await exportPng(build.htmlPath, path.join(build.outputDirectory, "slides"))
      pngPages = pngFiles.length
      if (pngPages !== expectedPages) throw new HtmlPptError("EXPORT_PAGE_COUNT", `PNG 页数 ${pngPages} 与 HTML 页数 ${expectedPages} 不一致`)
      await exportContactSheet(build.outputDirectory, pngFiles, `${compiled.deck.meta.title} · ${compiled.theme.manifest.name}`)
      themeReviewPath = await exportThemeReview(build.outputDirectory, pngFiles, compiled.theme)
      if (format === "pptx-flat" || format === "all") {
        pptxPages = await exportPptxFlat(pngFiles, path.join(build.outputDirectory, "deck.pptx"), {
          title: compiled.deck.meta.title,
          language: compiled.deck.meta.language,
          buildId: compiled.buildId,
          slideLabels: compiled.plannedDeck.slides.map((slide) => slide.id),
        })
        if (pptxPages !== expectedPages) throw new HtmlPptError("EXPORT_PAGE_COUNT", `PPTX 页数 ${pptxPages} 与 HTML 页数 ${expectedPages} 不一致`)
      }
    }
    const files = [
      "index.html",
      "deck.ir.json",
      "deck.planned.json",
      "build.json",
      "report.json",
      ...(format === "pdf" || format === "all" ? ["deck.pdf"] : []),
      ...(format === "png" || format === "pptx-flat" || format === "all" ? ["slides/", "contact-sheet.html"] : []),
      ...(format === "pptx-flat" || format === "all" ? ["deck.pptx"] : []),
      ...(themeReviewPath ? [path.basename(themeReviewPath)] : []),
    ]
    await writeFile(path.join(build.outputDirectory, "delivery.json"), `${JSON.stringify({
      schemaVersion: 1,
      status: "complete",
      buildId: compiled.buildId,
      theme: compiled.theme.manifest.name,
      slideCount: expectedPages,
      artifacts: {
        htmlPages: expectedPages,
        ...(pdfPages !== undefined ? { pdfPages } : {}),
        ...(pngPages !== undefined ? { pngPages, pngSize: "2560x1440" } : {}),
        ...(pptxPages !== undefined ? {
          pptxPages,
          pptxMode: "flat",
          pptxEditable: false,
          pptxSize: "13.333333x7.5in",
          pptxImageSize: "2560x1440",
        } : {}),
      },
      files,
    }, null, 2)}\n`, { encoding: "utf8", flag: "wx" })
    await rename(workingOutput, finalOutput)
    log(args, `导出完成：${finalOutput}\n`)
    verbose(args, `buildId=${compiled.buildId} theme=${compiled.theme.manifest.name} slides=${compiled.plannedDeck.slides.length}\n`)
    return 0
  } catch (error) {
    process.stderr.write(`${formatError(error)}\n`)
    return error instanceof HtmlPptError && error.code.startsWith("CLI_") ? 2 : 1
  }
}

function parseArguments(argv: string[]): Arguments {
  const result: Arguments = { port: 4173, strict: false, help: false, logLevel: "normal" }
  const command = argv[0]
  if (command === "--help" || command === "-h") return { ...result, help: true }
  if (!command) return result
  if (!["build", "preview", "export", "check", "inspect-ir", "check-themes"].includes(command)) {
    throw new HtmlPptError("CLI_COMMAND", `未知命令：${command}`, {}, "使用 --help 查看命令")
  }
  result.command = command as Command
  const positional: string[] = []
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index]!
    if (value === "--help" || value === "-h") result.help = true
    else if (value === "--strict") result.strict = true
    else if (["--theme", "--output", "--format", "--port", "--log-level"].includes(value)) {
      const next = argv[index + 1]
      if (!next) throw new HtmlPptError("CLI_OPTION", `${value} 缺少值`)
      index += 1
      if (value === "--theme") result.theme = next
      if (value === "--output") result.output = next
      if (value === "--format") {
        if (!["pdf", "png", "pptx-flat", "all"].includes(next)) throw new HtmlPptError("CLI_FORMAT", `未知导出格式：${next}`)
        result.format = next as "pdf" | "png" | "pptx-flat" | "all"
      }
      if (value === "--port") {
        const port = Number(next)
        if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new HtmlPptError("CLI_PORT", "端口必须是 1024～65535 的整数")
        result.port = port
      }
      if (value === "--log-level") {
        if (!["quiet", "normal", "verbose"].includes(next)) throw new HtmlPptError("CLI_LOG_LEVEL", `未知日志级别：${next}`)
        result.logLevel = next as Arguments["logLevel"]
      }
    } else if (value.startsWith("-")) throw new HtmlPptError("CLI_OPTION", `未知参数：${value}`)
    else positional.push(value)
  }
  if (positional.length > 1) throw new HtmlPptError("CLI_POSITIONAL", "只能提供一个 Markdown 输入文件")
  if (positional[0]) result.input = positional[0]
  return result
}

function requireInput(args: Arguments, projectRoot: string): string {
  if (!args.input) throw new HtmlPptError("CLI_INPUT", `${args.command} 需要 Markdown 输入文件`)
  const input = path.resolve(projectRoot, args.input)
  if (!isInside(projectRoot, input)) throw new HtmlPptError("INPUT_PATH", "输入文件必须位于项目工作区内", { file: input })
  return input
}

function resolveOutput(projectRoot: string, output: string): string {
  const resolved = path.resolve(projectRoot, output)
  if (!isInside(projectRoot, resolved)) throw new HtmlPptError("OUTPUT_PATH", "输出目录必须位于项目工作区内", { file: resolved })
  return resolved
}

function printReport(report: Awaited<ReturnType<typeof runPreflight>>, args: Arguments): void {
  if (args.logLevel === "quiet" && report.errors === 0) return
  for (const issue of report.issues) {
    process.stdout.write(`${issue.severity} ${issue.ruleId}${issue.slideId ? ` ${issue.slideId}` : ""} ${issue.message}\n`)
  }
  process.stdout.write(`Preflight：${report.slideCount} 页，${report.errors} 错误，${report.warnings} 警告\n`)
}

function log(args: Arguments, message: string): void {
  if (args.logLevel !== "quiet") process.stdout.write(message)
}

function verbose(args: Arguments, message: string): void {
  if (args.logLevel === "verbose") process.stdout.write(message)
}

async function assertTargetMissing(target: string): Promise<void> {
  try {
    await stat(target)
    throw new HtmlPptError("OUTPUT_EXISTS", `输出目录已存在：${target}`, { file: target }, "使用新的输出目录，避免覆盖已有产物")
  } catch (error) {
    if (error instanceof HtmlPptError) throw error
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main()
}
