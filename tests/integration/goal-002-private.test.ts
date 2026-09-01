import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { compileDeck } from "../../src/build.js"
import { sha256 } from "../../src/utils.js"

const root = process.cwd()
const privateRoot = path.join(root, "inputs-private", "goal-002")

test("Goal 002 私有来源、内容覆盖与双主题语义一致", async (context) => {
  const manifestPath = path.join(privateRoot, "source-manifest.json")
  try {
    await access(manifestPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      context.skip("本地私有输入不存在")
      return
    }
    throw error
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    snapshot: string
    sha256: string
    headings: { h2: number; h3: number }
    rights: { usage: string; publication: boolean }
  }
  const snapshot = await readFile(path.join(privateRoot, manifest.snapshot))
  assert.equal(sha256(snapshot), manifest.sha256)
  assert.deepEqual(manifest.headings, { h1: 1, h2: 4, h3: 17 })
  assert.deepEqual(manifest.rights, {
    usage: "local-only",
    publication: false,
    basis: "user-requested Goal 002 execution",
  })

  const contentMap = await readFile(path.join(privateRoot, "content-map.md"), "utf8")
  assert.match(contentMap, /覆盖率：17／17，100％/)
  assert.equal((contentMap.match(/^- \[x\]/gm) ?? []).length, 17)

  const inputPath = path.join(privateRoot, "deck.md")
  const [base, cosmic] = await Promise.all([
    compileDeck({ projectRoot: root, inputPath, themeName: "base-light" }),
    compileDeck({ projectRoot: root, inputPath, themeName: "cosmic-mint" }),
  ])
  assert.equal(base.deck.slides.length, 27)
  assert.equal(base.plannedDeck.slides.length, 27)
  assert.deepEqual(cosmic.deck, base.deck)
  assert.deepEqual(cosmic.plannedDeck, base.plannedDeck)
  assert.notEqual(cosmic.html, base.html)
})
