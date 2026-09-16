import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const projectRoot = join(root, '..')

// Device from adb: wm size 1080x2340, wm density 420  → scale = 420/160 = 2.625
const SCALE = 420 / 160
const VIEWPORT = { width: Math.round(1080 / SCALE), height: Math.round(2340 / SCALE) }

// Android status bar: 24dp at density 420. Cropped from Android references only.
// Chrome-rendered baselines (11-chrome.png) have no status bar → crop 1dp.
const ANDROID_STATUS_BAR_PX = Math.round(24 * SCALE) // 63px
const CHROME_TOP_CROP_PX = Math.round(1 * SCALE)     // 3px
const BOTTOM_BAR_PX = 0

// Screens whose reference is a raw Android adb screenshot (has a status bar to crop)
const ANDROID_REF_SCREENS = new Set([
  'reader-pink', 'nav-drawer', 'dialog-select-theme',
  'info-viewer-preface', 'info-viewer-introduction', 'info-viewer-biography',
  'info-viewer-developer', 'dialog-about', 'audio-download', 'audio-delete',
])

const SCREEN_SCREENSHOT_MAP: Record<string, string> = {
  // *-chrome.png = Chrome-rendered baseline; raw .png = Android device (font rendering differs)
  splash: '11-chrome.png',
  reader: '01-chrome.png',
  'reader-pink': '12.png',
  'nav-drawer': '02.png',
  'dialog-select-theme': '03.png',
  'info-viewer-preface': '04.png',
  'info-viewer-introduction': '05.png',
  'info-viewer-biography': '06.png',
  'info-viewer-developer': '07.png',
  'dialog-about': '08.png',
  'audio-download': '09.png',
  'audio-delete': '10.png',
}

const PASS_LIMIT = 0.01

async function run() {
  const screenId = process.argv[2]
  if (!screenId) {
    console.error('Usage: npm run test:visual -- <screen-id>')
    process.exit(1)
  }

  const refFile = SCREEN_SCREENSHOT_MAP[screenId]
  if (!refFile) {
    console.error(`Unknown screen-id: ${screenId}`)
    console.error(`Known ids: ${Object.keys(SCREEN_SCREENSHOT_MAP).join(', ')}`)
    process.exit(1)
  }

  const refPath = join(projectRoot, 'App Screenshots', refFile)
  if (!existsSync(refPath)) {
    console.error(`Reference screenshot not found: ${refPath}`)
    process.exit(1)
  }

  const browser = await chromium.launch({
    args: ['--force-color-profile=srgb'],
  })
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
  })

  // Disable animations and caret
  await page.addStyleTag({
    content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; caret-color: transparent !important; }`,
  })

  const routeMap: Record<string, string> = {
    splash: '/',
    reader: '/s/18/1?nosplash=1',
    'reader-pink': '/s/18/3?nosplash=1&theme=PINK',
    'nav-drawer': '/?drawer=open',
    'info-viewer-preface': '/info/preface',
    'info-viewer-introduction': '/info/introduction',
    'info-viewer-biography': '/info/biography',
    'info-viewer-developer': '/info/developer',
    'dialog-select-theme': '/?dialog=theme',
    'dialog-about': '/?dialog=about',
    'audio-download': '/?dialog=download',
    'audio-delete': '/?dialog=delete',
  }

  const devServerUrl = process.env['VISUAL_CHECK_URL'] ?? 'http://localhost:5173'
  const url = `${devServerUrl}${routeMap[screenId] ?? '/'}`

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate('document.fonts.ready')

  const screenshotBuf = await page.screenshot({ type: 'png' })
  await browser.close()

  function cropTop(buf: Buffer, topPx: number): PNG {
    const png = PNG.sync.read(buf)
    const cropH = png.height - topPx - BOTTOM_BAR_PX
    const out = new PNG({ width: png.width, height: cropH })
    PNG.bitblt(png, out, 0, topPx, png.width, cropH, 0, 0)
    return out
  }

  // Android refs: crop real status bar; Chrome refs and candidate: crop only 1dp
  const refTopCrop = ANDROID_REF_SCREENS.has(screenId) ? ANDROID_STATUS_BAR_PX : CHROME_TOP_CROP_PX
  const refPng = cropTop(readFileSync(refPath), refTopCrop)
  const candidatePng = cropTop(screenshotBuf, CHROME_TOP_CROP_PX)

  // Crop both to shared area so pixelmatch gets equal-sized buffers
  const w = Math.min(refPng.width, candidatePng.width)
  const h = Math.min(refPng.height, candidatePng.height)

  function cropTo(src: PNG, tw: number, th: number): PNG {
    if (src.width === tw && src.height === th) return src
    const out = new PNG({ width: tw, height: th })
    PNG.bitblt(src, out, 0, 0, tw, th, 0, 0)
    return out
  }

  const ref = cropTo(refPng, w, h)
  const candidate = cropTo(candidatePng, w, h)

  const diff = new PNG({ width: w, height: h })
  // threshold 0.2: tolerates device-display color rendering variance in images
  // while still catching layout errors (position, size, missing elements)
  const mismatch = pixelmatch(ref.data, candidate.data, diff.data, w, h, {
    threshold: 0.2,
    includeAA: false,
  })

  const total = w * h
  const pct = mismatch / total
  const pass = pct <= PASS_LIMIT
  const pctStr = (pct * 100).toFixed(2)

  const diffPath = join(root, `tests/visual/${screenId}-diff.png`)
  writeFileSync(diffPath, PNG.sync.write(diff))

  console.log(`VISUAL ${screenId}: ${pctStr}% (limit ${PASS_LIMIT * 100}%) ${pass ? 'PASS' : 'FAIL'}`)
  if (!pass) {
    console.log(`  diff saved: ${diffPath}`)
    process.exit(1)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
