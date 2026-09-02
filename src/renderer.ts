import { readFile } from "node:fs/promises"
import path from "node:path"
import { HtmlPptError } from "./errors.js"
import type { Block, InlineContent, PlannedDeck, PlannedSlide, ThemePackage } from "./types.js"
import { escapeAttribute, escapeHtml, inlineText, resolveWorkspaceFile } from "./utils.js"

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
}

const SLIDE_DECORATIONS_HTML = Array.from({ length: 15 }, (_, index) => `<i class="hp-star" data-star-index="${index + 1}"></i>`).join("")

export interface RenderOptions {
  projectRoot: string
  inputPath: string
}

export async function renderDeck(deck: PlannedDeck, theme: ThemePackage, options: RenderOptions): Promise<string> {
  const renderedSlides: string[] = []
  for (const slide of deck.slides) renderedSlides.push(await renderSlide(slide, theme, options))
  return `<!doctype html>
<html lang="${escapeAttribute(deck.meta.language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="html-ppt-schema" content="1">
  <title>${escapeHtml(deck.meta.title)}</title>
  <style>${BASE_CSS}\n${theme.tokensCss}\n${theme.componentsCss}</style>
</head>
<body data-theme="${escapeAttribute(theme.manifest.name)}">
  <main class="deck" aria-label="${escapeAttribute(deck.meta.title)}">
${renderedSlides.join("\n")}
  </main>
  <script>${RUNTIME_SCRIPT}</script>
</body>
</html>
`
}

async function renderSlide(slide: PlannedSlide, theme: ThemePackage, options: RenderOptions): Promise<string> {
  const content = await renderLayout(slide, options)
  return `    <section class="slide layout-${slide.layout}" id="${escapeAttribute(slide.id)}" data-slide-id="${escapeAttribute(slide.id)}" data-slide-index="${slide.index}" data-slide-state="${slide.index === 1 ? "active" : "after"}" data-layout="${slide.layout}" data-safe-area="${theme.manifest.canvas.safeArea}" aria-label="第 ${slide.index} 页" aria-hidden="${slide.index === 1 ? "false" : "true"}">
      <div class="slide-decorations" aria-hidden="true">${SLIDE_DECORATIONS_HTML}</div>
      <div class="meteor-field" aria-hidden="true"></div>
      <div class="slide-inner">${content}</div>
      <span class="slide-number" aria-hidden="true">${String(slide.index).padStart(2, "0")}</span>
    </section>`
}

async function renderLayout(slide: PlannedSlide, options: RenderOptions): Promise<string> {
  const { title, body } = splitTitle(slide.blocks)
  const titleHtml = title ? `<header class="slide-title" data-block data-preflight-box data-min-font="heading"${sourceLine(title)}>${renderInline(title.content)}</header>` : ""

  switch (slide.layout) {
    case "cover":
    case "section":
    case "ending":
      return `<div class="hero-shell">${titleHtml}<div class="hero-body">${await renderBlocks(body, options)}</div></div>`
    case "title-body":
      return `${titleHtml}<div class="body-stack">${await renderBlocks(body, options)}</div>`
    case "two-column":
    case "comparison": {
      const columns = splitColumns(body)
      return `${titleHtml}<div class="columns">${await Promise.all(columns.map(async (column) => `<section class="column" data-preflight-box>${await renderBlocks(column, options)}</section>`)).then((parts) => parts.join(""))}</div>`
    }
    case "image-text": {
      const image = body.find((block) => block.type === "image")
      const text = body.filter((block) => block !== image)
      return `${titleHtml}<div class="image-text-grid"><div class="image-pane">${image ? await renderBlock(image, options) : ""}</div><div class="text-pane">${await renderBlocks(text, options)}</div></div>`
    }
    case "metrics":
      return `${titleHtml}<div class="metric-grid">${await renderBlocks(body, options)}</div>`
    case "timeline": {
      const list = body.find((block) => block.type === "list")
      return `${titleHtml}<div class="timeline">${list?.type === "list" ? await renderTimeline(list, options) : ""}</div>`
    }
    case "quote":
      return `${titleHtml}<div class="quote-shell">${await renderBlocks(body, options)}</div>`
    case "chart": {
      const table = body.find((block) => block.type === "table")
      const extra = body.filter((block) => block !== table)
      return `${titleHtml}<div class="chart-shell">${table?.type === "table" ? renderChart(table) : ""}</div>${await renderBlocks(extra, options)}`
    }
    case "full-bleed-image": {
      const image = body.find((block) => block.type === "image")
      const overlay = body.filter((block) => block !== image)
      return `<div class="full-bleed-media">${image ? await renderImage(image, options, true) : ""}</div><div class="full-bleed-overlay">${titleHtml}${await renderBlocks(overlay, options)}</div>`
    }
  }
}

function splitTitle(blocks: Block[]): { title?: Extract<Block, { type: "heading" }>; body: Block[] } {
  const index = blocks.findIndex((block) => block.type === "heading" && block.level === 1)
  if (index < 0) return { body: blocks }
  const title = blocks[index] as Extract<Block, { type: "heading" }>
  return { title, body: blocks.filter((_, blockIndex) => blockIndex !== index) }
}

function splitColumns(blocks: Block[]): Block[][] {
  const columns: Block[][] = []
  for (const block of blocks) {
    if (block.type === "heading" && block.level === 2) columns.push([block])
    else {
      if (columns.length === 0) columns.push([])
      columns.at(-1)!.push(block)
    }
  }
  if (columns.length === 1) {
    const midpoint = Math.ceil(columns[0]!.length / 2)
    return [columns[0]!.slice(0, midpoint), columns[0]!.slice(midpoint)]
  }
  return columns.slice(0, 2)
}

async function renderBlocks(blocks: Block[], options: RenderOptions): Promise<string> {
  return (await Promise.all(blocks.map((block) => renderBlock(block, options)))).join("")
}

async function renderBlock(block: Block, options: RenderOptions): Promise<string> {
  const attributes = `data-block data-preflight-box${sourceLine(block)}`
  switch (block.type) {
    case "heading":
      return `<h${block.level} ${attributes} data-min-font="heading">${renderInline(block.content)}</h${block.level}>`
    case "paragraph":
      return `<p ${attributes} data-min-font="body">${renderInline(block.content)}</p>`
    case "list": {
      const tag = block.ordered ? "ol" : "ul"
      const start = block.ordered && block.start ? ` start="${block.start}"` : ""
      const items = await Promise.all(block.items.map(async (item, index) => {
        const checked = block.checked?.[index]
        const marker = checked === null || checked === undefined ? "" : `<span class="task-marker" aria-label="${checked ? "已完成" : "未完成"}">${checked ? "✓" : ""}</span>`
        return `<li${checked === null || checked === undefined ? "" : ` class="task-item" data-checked="${checked}"`}>${marker}${await renderBlocks(item, options)}</li>`
      }))
      return `<${tag} ${attributes} data-min-font="body"${start}>${items.join("")}</${tag}>`
    }
    case "quote":
      return `<blockquote ${attributes} data-min-font="body">${await renderBlocks(block.blocks, options)}</blockquote>`
    case "code":
      return `<pre ${attributes} data-min-font="caption"><code${block.language ? ` class="language-${escapeAttribute(block.language)}"` : ""}>${escapeHtml(block.value)}</code></pre>`
    case "image":
      return renderImage(block, options)
    case "table": {
      const rows = block.rows.map((row, rowIndex) => `<tr>${row.map((cell) => `<${rowIndex === 0 ? "th" : "td"}>${renderInline(cell)}</${rowIndex === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")
      return `<table ${attributes} data-min-font="caption">${rows}</table>`
    }
    case "metric":
      return `<article class="metric" ${attributes}><strong>${escapeHtml(block.value)}</strong><span data-min-font="body">${escapeHtml(block.label)}</span></article>`
  }
}

async function renderImage(block: Extract<Block, { type: "image" }>, options: RenderOptions, bleed = false): Promise<string> {
  const file = await resolveWorkspaceFile(options.projectRoot, path.dirname(options.inputPath), block.src)
  const extension = path.extname(file).toLowerCase()
  const mime = MIME_TYPES[extension]
  if (!mime) throw new HtmlPptError(
    "IMAGE_FORMAT",
    `不支持的图片格式：${extension}`,
    { ...(block.source ? { line: block.source.start.line } : {}) },
    "使用 PNG、JPEG、GIF、WebP 或 SVG",
  )
  const data = await readFile(file)
  return `<img data-block data-preflight-box${bleed ? " data-allow-bleed=\"true\"" : ""}${sourceLine(block)} src="data:${mime};base64,${data.toString("base64")}" alt="${escapeAttribute(block.alt)}"${block.title ? ` title="${escapeAttribute(block.title)}"` : ""}>`
}

function renderInline(nodes: InlineContent[]): string {
  return nodes.map((node) => {
    switch (node.type) {
      case "text":
        return escapeHtml(node.value)
      case "inlineCode":
        return `<code>${escapeHtml(node.value)}</code>`
      case "break":
        return "<br>"
      case "emphasis":
        return `<em>${renderInline(node.children)}</em>`
      case "strong":
        return `<strong>${renderInline(node.children)}</strong>`
      case "delete":
        return `<del>${renderInline(node.children)}</del>`
      case "link":
        return `<a href="${escapeAttribute(node.url)}"${node.title ? ` title="${escapeAttribute(node.title)}"` : ""} rel="noreferrer">${renderInline(node.children)}</a>`
      case "image":
        return `<span class="inline-image-alt">[图片：${escapeHtml(node.alt)}]</span>`
    }
  }).join("")
}

async function renderTimeline(list: Extract<Block, { type: "list" }>, options: RenderOptions): Promise<string> {
  return (await Promise.all(list.items.map(async (item, index) => `<article class="timeline-item" data-block data-preflight-box><span>${String(index + 1).padStart(2, "0")}</span><div>${await renderBlocks(item, options)}</div></article>`))).join("")
}

function renderChart(table: Extract<Block, { type: "table" }>): string {
  const rows = table.rows.slice(1)
  const values = rows.map((row) => Number(inlineText(row[1] ?? []))).filter((value) => Number.isFinite(value) && value >= 0)
  const max = Math.max(...values, 1)
  return rows.map((row, index) => {
    const label = inlineText(row[0] ?? [])
    const raw = Number(inlineText(row[1] ?? []))
    const value = Number.isFinite(raw) && raw >= 0 ? raw : 0
    const width = Math.max(2, (value / max) * 100)
    return `<div class="chart-row" data-block data-preflight-box><span>${escapeHtml(label)}</span><div><i style="width:${width.toFixed(2)}%;--bar-index:${index}"></i></div><strong>${escapeHtml(String(value))}</strong></div>`
  }).join("")
}

function sourceLine(block: Block): string {
  return block.source ? ` data-source-line="${block.source.start.line}"` : ""
}

const RUNTIME_SCRIPT = `
(() => {
  const root = document.documentElement;
  const deck = document.querySelector('.deck');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const mode = new URLSearchParams(window.location.search).get('mode') === 'render' ? 'render' : 'presentation';
  root.dataset.hpRuntime = 'ready';
  root.dataset.hpMode = mode;
  let currentIndex = 0;
  let wheelTotal = 0;
  let wheelDirection = 0;
  let wheelTriggered = false;
  let wheelLastAt = 0;
  let wheelTailFloor = Number.POSITIVE_INFINITY;
  let wheelTimer;
  let touchStartX = 0;
  let touchStartY = 0;
  let restartMeteorMotion = () => {};

  const hashSlideIndex = () => {
    if (!window.location.hash) return 0;
    let id = window.location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch {}
    const index = slides.findIndex((slide) => slide.id === id);
    return index >= 0 ? index : 0;
  };

  const updateSlides = (nextIndex, updateHash = true) => {
    if (mode !== 'presentation' || slides.length === 0) return;
    const boundedIndex = Math.max(0, Math.min(nextIndex, slides.length - 1));
    const changed = boundedIndex !== currentIndex;
    if (changed) deck?.setAttribute('data-navigation', boundedIndex > currentIndex ? 'forward' : 'backward');
    currentIndex = boundedIndex;
    slides.forEach((slide, index) => {
      const state = index === currentIndex ? 'active' : index < currentIndex ? 'before' : 'after';
      slide.dataset.slideState = state;
      slide.setAttribute('aria-hidden', state === 'active' ? 'false' : 'true');
      if (state === 'active') slide.setAttribute('aria-current', 'page');
      else slide.removeAttribute('aria-current');
    });
    deck?.setAttribute('data-current-slide', String(currentIndex + 1));
    if (updateHash) window.history.replaceState(null, '', '#' + encodeURIComponent(slides[currentIndex].id));
    if (changed) restartMeteorMotion();
  };

  const resize = () => {
    const scale = mode === 'presentation' ? Math.min(window.innerWidth / 1280, window.innerHeight / 720) : 1;
    root.style.setProperty('--hp-preview-scale', String(Math.max(scale, 0.1)));
  };

  const navigate = (delta) => updateSlides(currentIndex + delta);
  const resetWheelGesture = (direction = 0) => {
    wheelTotal = 0;
    wheelDirection = direction;
    wheelTriggered = false;
    wheelTailFloor = Number.POSITIVE_INFINITY;
  };
  const editableTarget = (target) => target instanceof Element && Boolean(target.closest('input,textarea,select,button,a,[contenteditable="true"]'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cosmicPresentation = mode === 'presentation' && document.body.dataset.theme === 'cosmic-mint';
  let meteorTimer;
  let meteorWave = 0;
  let randomState = 0;

  const seedMotionRandom = () => {
    if (randomState !== 0) return;
    const seed = new Uint32Array(1);
    window.crypto.getRandomValues(seed);
    randomState = seed[0] || 0x6d2b79f5;
    root.dataset.hpMotionSeed = String(randomState >>> 0);
  };

  const motionRandom = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 4294967296;
  };

  const clearMeteorMotion = () => {
    window.clearTimeout(meteorTimer);
    meteorTimer = undefined;
    slides.forEach((slide) => {
      slide.querySelectorAll('.hp-meteor').forEach((meteor) => {
        meteor.getAnimations().forEach((animation) => animation.cancel());
        meteor.remove();
      });
    });
  };

  const scheduleMeteorWave = (initial = false) => {
    if (!cosmicPresentation || reducedMotion.matches) return;
    const delay = initial ? 420 + motionRandom() * 580 : 3800 + motionRandom() * 5200;
    if (deck) deck.dataset.meteorNextDelay = String(Math.round(delay));
    meteorTimer = window.setTimeout(spawnMeteorWave, delay);
  };

  const spawnMeteorWave = () => {
    if (!cosmicPresentation || reducedMotion.matches) return;
    const slide = slides[currentIndex];
    const field = slide?.querySelector('.meteor-field');
    if (!(field instanceof HTMLElement)) return;
    field.replaceChildren();
    meteorWave += 1;
    const count = 1 + Math.floor(motionRandom() * 3);
    if (deck) {
      deck.dataset.meteorWave = String(meteorWave);
      deck.dataset.meteorWaveCount = String(count);
    }
    field.dataset.wave = String(meteorWave);
    field.dataset.waveCount = String(count);
    for (let index = 0; index < count; index += 1) {
      const startX = -8 - motionRandom() * 22;
      const startY = Math.min(500, 132 + motionRandom() * 300 + index * 22);
      const endX = Math.min(840, 340 + (startY - 132) * 1.08 + motionRandom() * 120);
      const endY = -18 - motionRandom() * 28;
      const dx = endX - startX;
      const dy = endY - startY;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const length = 130 + motionRandom() * 170;
      const duration = 1900 + motionRandom() * 700;
      const delay = index * (110 + motionRandom() * 190);
      const meteor = document.createElement('i');
      meteor.className = 'hp-meteor';
      meteor.style.left = String(startX - length) + 'px';
      meteor.style.top = String(startY) + 'px';
      meteor.style.width = String(length) + 'px';
      meteor.style.rotate = String(angle) + 'deg';
      meteor.dataset.wave = String(meteorWave);
      meteor.dataset.path = [startX, startY, endX, endY].map((value) => Math.round(value)).join(',');
      meteor.dataset.duration = String(Math.round(duration));
      field.append(meteor);
      meteor.animate([
        { offset: 0, translate: '0px 0px', scale: '.18 1', opacity: 0 },
        { offset: .12, translate: String(dx * .12) + 'px ' + String(dy * .12) + 'px', scale: '.42 1', opacity: .2 },
        { offset: .34, translate: String(dx * .34) + 'px ' + String(dy * .34) + 'px', scale: '1 1', opacity: .96 },
        { offset: .78, translate: String(dx * .78) + 'px ' + String(dy * .78) + 'px', scale: '.88 1', opacity: .74 },
        { offset: 1, translate: String(dx) + 'px ' + String(dy) + 'px', scale: '.52 1', opacity: 0 },
      ], { duration, delay, easing: 'linear', fill: 'both' });
    }
    scheduleMeteorWave(false);
  };

  restartMeteorMotion = () => {
    clearMeteorMotion();
    if (!cosmicPresentation || reducedMotion.matches) return;
    seedMotionRandom();
    scheduleMeteorWave(true);
  };

  reducedMotion.addEventListener('change', () => restartMeteorMotion());

  window.addEventListener('resize', resize);
  if (mode === 'presentation') {
    updateSlides(hashSlideIndex());
    window.addEventListener('hashchange', () => updateSlides(hashSlideIndex()));
    window.addEventListener('keydown', (event) => {
      if (editableTarget(event.target)) return;
      const forward = ['ArrowRight', 'ArrowDown', 'PageDown'];
      const backward = ['ArrowLeft', 'ArrowUp', 'PageUp'];
      if (forward.includes(event.key) || (event.key === ' ' && !event.shiftKey)) {
        event.preventDefault();
        navigate(1);
      } else if (backward.includes(event.key) || (event.key === ' ' && event.shiftKey)) {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        updateSlides(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        updateSlides(slides.length - 1);
      }
    });
    window.addEventListener('wheel', (event) => {
      event.preventDefault();
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (delta === 0) return;
      const direction = Math.sign(delta);
      const magnitude = Math.abs(delta);
      const now = performance.now();
      const eventGap = wheelLastAt === 0 ? Number.POSITIVE_INFINITY : now - wheelLastAt;
      const reversed = wheelDirection !== 0 && direction !== wheelDirection;
      const acceleratedAfterTail = wheelTriggered
        && wheelTailFloor <= 10
        && magnitude >= Math.max(14, wheelTailFloor * 2.4);
      const restarted = wheelTriggered && !reversed && (eventGap >= 56 || acceleratedAfterTail);
      if (reversed || restarted) resetWheelGesture(direction);
      else if (wheelDirection === 0) wheelDirection = direction;
      wheelLastAt = now;
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        resetWheelGesture();
        wheelLastAt = 0;
      }, 120);
      if (wheelTriggered) {
        wheelTailFloor = Math.min(wheelTailFloor, magnitude);
        return;
      }
      wheelTotal += delta;
      if (Math.abs(wheelTotal) >= 24) {
        navigate(wheelTotal > 0 ? 1 : -1);
        wheelTotal = 0;
        wheelTriggered = true;
        wheelTailFloor = Number.POSITIVE_INFINITY;
      }
    }, { passive: false });
    window.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });
    window.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const distance = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      if (Math.abs(distance) >= 60) navigate(distance < 0 ? 1 : -1);
    }, { passive: true });
  } else {
    slides.forEach((slide) => {
      slide.dataset.slideState = 'active';
      slide.setAttribute('aria-hidden', 'false');
    });
  }
  restartMeteorMotion();
  resize();
  Promise.all([
    document.fonts.ready,
    ...Array.from(document.images).map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    }))
  ]).then(() => document.documentElement.dataset.renderReady = 'true');
})();`

const BASE_CSS = `
* { box-sizing: border-box; }
:root { --hp-preview-scale: 1; }
html, body { margin: 0; width: 100%; min-height: 100%; background: var(--hp-stage-background, var(--hp-color-background, #101114)); }
body { font-family: var(--hp-font-body); color: var(--hp-color-text); }
.deck { display: grid; gap: 32px; justify-content: center; padding: 32px; }
.slide { position: relative; width: 1280px; height: 720px; overflow: hidden; background: var(--hp-color-background); color: var(--hp-color-text); box-shadow: 0 18px 70px rgba(0,0,0,.28); }
.slide-decorations { display: none; }
.meteor-field { display: none; }
.slide-inner { position: absolute; inset: 0; padding: var(--hp-safe-area, 64px); display: flex; flex-direction: column; gap: calc(var(--hp-spacing-unit) * 3); }
.slide-title { margin: 0; font-family: var(--hp-font-heading); font-size: 48px; line-height: 1.08; font-weight: 760; letter-spacing: -.035em; }
.slide-number { position: absolute; right: 30px; bottom: 22px; font: 600 13px/1 var(--hp-font-body); color: var(--hp-color-muted); letter-spacing: .12em; }
.body-stack { display: flex; flex: 1; flex-direction: column; justify-content: center; gap: calc(var(--hp-spacing-unit) * 2); min-height: 0; }
.hero-shell { display: flex; flex: 1; flex-direction: column; justify-content: center; max-width: 930px; gap: calc(var(--hp-spacing-unit) * 3); }
.layout-cover .slide-title, .layout-ending .slide-title { font-family: var(--hp-font-display); font-size: 82px; max-width: 1000px; }
.layout-section .slide-title { font-size: 68px; }
.hero-body { font-size: 28px; color: var(--hp-color-muted); }
h2 { margin: 0 0 18px; font: 720 28px/1.15 var(--hp-font-heading); }
h3, h4, h5, h6 { margin: 0; font-family: var(--hp-font-heading); }
p, ul, ol, blockquote { margin: 0; font-size: 24px; line-height: 1.45; }
ul, ol { display: grid; gap: 12px; padding-left: 1.25em; }
li > p { font-size: inherit; }
.task-item { list-style: none; display: grid; grid-template-columns: 1em 1fr; gap: .45em; margin-left: -1.25em; align-items: baseline; }
.task-marker { display: inline-grid; width: .9em; height: .9em; place-items: center; border: 2px solid var(--hp-color-border); border-radius: .2em; color: var(--hp-color-background); background: var(--hp-color-accent); font-size: .75em; line-height: 1; }
.task-item[data-checked="false"] .task-marker { background: transparent; }
a { color: var(--hp-color-accent); }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
pre { margin: 0; padding: 22px; overflow: hidden; border: 1px solid var(--hp-color-border); border-radius: var(--hp-radius-small); background: var(--hp-color-surface); font-size: 18px; line-height: 1.4; }
table { width: 100%; border-collapse: collapse; font-size: 18px; }
th, td { padding: 12px 16px; border-bottom: 1px solid var(--hp-color-border); text-align: left; }
.columns { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: calc(var(--hp-spacing-unit) * 4); flex: 1; min-height: 0; align-items: stretch; }
.column { padding: 30px; border: 1px solid var(--hp-color-border); border-radius: var(--hp-radius-large); background: var(--hp-color-surface); display: flex; flex-direction: column; gap: 18px; }
.image-text-grid { display: grid; grid-template-columns: 1.12fr .88fr; gap: calc(var(--hp-spacing-unit) * 4); flex: 1; min-height: 0; }
.image-pane, .text-pane { min-height: 0; }
.image-pane img { width: 100%; height: 100%; object-fit: cover; border-radius: var(--hp-image-radius); filter: var(--hp-image-filter); }
.text-pane { display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 24px; flex: 1; align-content: center; }
.metric { min-height: 180px; padding: 30px; border-radius: var(--hp-radius-large); background: var(--hp-color-surface); border: 1px solid var(--hp-color-border); display: flex; flex-direction: column; justify-content: space-between; }
.metric strong { font: 760 64px/1 var(--hp-font-display); color: var(--hp-color-accent); }
.metric span { font-size: 21px; color: var(--hp-color-muted); }
.timeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 14px; flex: 1; align-items: center; }
.timeline-item { min-width: 0; min-height: 250px; padding: 24px; border-top: 5px solid var(--hp-color-accent); background: var(--hp-color-surface); }
.timeline-item > span { display: block; margin-bottom: 36px; color: var(--hp-color-accent); font-weight: 800; }
.timeline-item p { font-size: 18px; }
.quote-shell { display: flex; flex: 1; align-items: center; justify-content: center; }
blockquote { max-width: 950px; padding-left: 42px; border-left: 8px solid var(--hp-color-accent); font: 620 42px/1.28 var(--hp-font-heading); }
blockquote p { font: inherit; }
.chart-shell { display: grid; gap: 18px; flex: 1; align-content: center; }
.chart-row { display: grid; grid-template-columns: 150px 1fr 70px; gap: 18px; align-items: center; font-size: 18px; }
.chart-row > div { height: 30px; border-radius: 999px; background: var(--hp-color-surface); overflow: hidden; }
.chart-row i { display: block; height: 100%; border-radius: inherit; background: var(--hp-color-accent); }
.full-bleed-media { position: absolute; inset: 0; }
.full-bleed-media img { width: 100%; height: 100%; object-fit: cover; filter: var(--hp-image-filter); }
.full-bleed-media::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.74), rgba(0,0,0,.1)); }
.full-bleed-overlay { position: relative; z-index: 1; display: flex; flex: 1; flex-direction: column; justify-content: center; width: 70%; color: white; gap: 22px; }
.full-bleed-overlay .slide-title { font-size: 68px; }
.inline-image-alt { padding: .1em .35em; border-radius: .25em; background: var(--hp-color-surface); color: var(--hp-color-muted); }
@media screen {
  html[data-hp-runtime="ready"][data-hp-mode="presentation"],
  html[data-hp-runtime="ready"][data-hp-mode="presentation"] body { height: 100%; overflow: hidden; }
  html[data-hp-mode="presentation"] .deck { position: relative; display: block; width: 100vw; height: 100vh; padding: 0; overflow: hidden; background: var(--hp-stage-background, var(--hp-color-background)); }
  html[data-hp-mode="presentation"] .slide { position: absolute; left: 50%; top: 50%; margin: 0; opacity: 0; visibility: hidden; pointer-events: none; translate: 34px 0; transform: translate(-50%, -50%) scale(var(--hp-preview-scale)); transform-origin: center; }
  html[data-hp-mode="presentation"] .slide[data-slide-state="before"] { translate: -34px 0; }
  html[data-hp-mode="presentation"] .slide[data-slide-state="active"] { z-index: 1; opacity: 1; visibility: visible; pointer-events: auto; translate: 0px 0px; }
  html[data-hp-mode="presentation"] .deck[data-navigation="forward"] .slide[data-slide-state="active"] { animation: hp-slide-enter-forward 340ms cubic-bezier(.22,.61,.36,1) both; }
  html[data-hp-mode="presentation"] .deck[data-navigation="backward"] .slide[data-slide-state="active"] { animation: hp-slide-enter-backward 340ms cubic-bezier(.22,.61,.36,1) both; }
  html[data-hp-mode="render"] .slide { animation: none; translate: none; transform: none; }
}
@keyframes hp-slide-enter-forward { from { opacity: 0; translate: 34px 0; } to { opacity: 1; translate: 0px 0px; } }
@keyframes hp-slide-enter-backward { from { opacity: 0; translate: -34px 0; } to { opacity: 1; translate: 0px 0px; } }
@media (prefers-reduced-motion: reduce) {
  html[data-hp-mode="presentation"] .slide { animation: none !important; }
}
@media print {
  @page { size: 13.333in 7.5in; margin: 0; }
  html, body { width: 13.333in; height: auto; overflow: visible; background: transparent; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .deck { display: block; padding: 0; }
  .slide { position: relative; left: auto; top: auto; width: 13.333in; height: 7.5in; opacity: 1; visibility: visible; pointer-events: auto; animation: none; translate: none; transform: none; box-shadow: none; break-after: page; page-break-after: always; }
  .slide:last-child { break-after: auto; page-break-after: auto; }
}`
