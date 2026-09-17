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

// Android status bar: pixel scan of 02.png shows content (white header) starts at y=100.
// So effective top crop = 100px (≈38dp at density 420), not the nominal 24dp.
// Chrome-rendered baselines (11-chrome.png) have no status bar → crop 1dp.
const ANDROID_STATUS_BAR_PX = 100
const CHROME_TOP_CROP_PX = Math.round(1 * SCALE)     // 3px
const BOTTOM_BAR_PX = 0

// Screens whose reference is a raw Android adb screenshot (has a status bar to crop)
const ANDROID_REF_SCREENS = new Set([
  'reader-pink',
])

const SCREEN_SCREENSHOT_MAP: Record<string, string> = {
  // *-chrome.png = Chrome-rendered baseline; raw .png = Android device (font rendering differs)
  splash: '11-chrome.png',
  reader: '01-chrome.png',
  'reader-pink': '12.png',
  'nav-drawer': '02-chrome.png',
  'dialog-select-theme': '13-chrome.png',
  'info-viewer-preface': '04-chrome.png',
  'info-viewer-introduction': '05-chrome.png',
  'info-viewer-biography': '06-chrome.png',
  'info-viewer-developer': '07-chrome.png',
  'dialog-about': 'dialog-about-chrome.png',
  'audio-download': '09-chrome.png',
  'audio-delete': 'audio-delete-chrome.png',
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
    'nav-drawer': '/?nosplash=1&drawer=open',
    'info-viewer-preface': '/info/preface?nosplash=1',
    'info-viewer-introduction': '/info/introduction?nosplash=1',
    'info-viewer-biography': '/info/biography?nosplash=1',
    'info-viewer-developer': '/info/developer?nosplash=1',
    'dialog-select-theme': '/?nosplash=1&dialog=theme',
    'dialog-about': '/?nosplash=1&dialog=about',
    'audio-download': '/?nosplash=1&dialog=download',
    'audio-delete': '/?nosplash=1&dialog=delete',
  }

  const devServerUrl = process.env['VISUAL_CHECK_URL'] ?? 'http://localhost:5173'
  const url = `${devServerUrl}${routeMap[screenId] ?? '/'}`

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate('document.fonts.ready')

  const screenshotBuf = await page.screenshot({ type: 'png' })
  await browser.close()

  // --save-baseline: write Chrome screenshot to App Screenshots/<screenId>-chrome.png and exit
  if (process.argv[3] === '--save-baseline') {
    const baselinePath = join(projectRoot, 'App Screenshots', `${screenId}-chrome.png`)
    writeFileSync(baselinePath, screenshotBuf)
    console.log(`Baseline saved: ${baselinePath}`)
    return
  }

  function cropTop(buf: Buffer, topPx: number): PNG {
    const png = PNG.sync.read(buf)
    const cropH = png.height - topPx - BOTTOM_BAR_PX
    const out = new PNG({ width: png.width, height: cropH })
    PNG.bitblt(png, out, 0, topPx, png.width, cropH, 0, 0)
    return out
  }

  const refTopCrop = ANDROID_REF_SCREENS.has(screenId) ? ANDROID_STATUS_BAR_PX : CHROME_TOP_CROP_PX
  const candidateTopCrop = CHROME_TOP_CROP_PX
  const refPng = cropTop(readFileSync(refPath), refTopCrop)
  const candidatePng = cropTop(screenshotBuf, candidateTopCrop)

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

  // Some screens (e.g. nav-drawer) show partial reader content behind the overlay.
  // The reader renders differently on Android vs Chrome (font/antialiasing), so mask
  // out that region by blanking x >= maskRightEdgePx in both images before diffing.
  // maskRightEdgePx is in physical pixels (post-crop).
  const MASK_RIGHT_EDGE: Partial<Record<string, number>> = {
    'nav-drawer': Math.round(320 * SCALE), // drawer width = 320dp
  }
  const maskEdge = MASK_RIGHT_EDGE[screenId]
  if (maskEdge !== undefined) {
    function maskRight(png: PNG, edgePx: number) {
      for (let y = 0; y < png.height; y++) {
        for (let x = edgePx; x < png.width; x++) {
          const i = (y * png.width + x) * 4
          png.data[i] = 255
          png.data[i + 1] = 255
          png.data[i + 2] = 255
          png.data[i + 3] = 255
        }
      }
    }
    maskRight(ref, maskEdge)
    maskRight(candidate, maskEdge)
  }

  // Dialog screens: blank everything OUTSIDE the dialog box so only the dialog
  // content is compared (background reader content never pixel-matches between
  // Android and Chrome). Bounds in physical px after crop.
  // Both images use ANDROID_STATUS_BAR_PX crop, so dialog center Y ≈ 2340/2 - 100 = 1070px.
  // Dialog is 280dp wide, centered horizontally; 40px extra padding on all sides.
  const DIALOG_BOX: Partial<Record<string, { x1: number; y1: number; x2: number; y2: number }>> = {
    'dialog-about': {
      // Chrome baseline: dialog centered at viewport-height/2 px, crop = CHROME_TOP_CROP_PX (3px)
      // Card is 320dp wide (measured on 08.png), not 280dp.
      x1: Math.round((w - 320 * SCALE) / 2) + 20,
      x2: Math.round((w + 320 * SCALE) / 2) - 20,
      y1: Math.round(2340 / 2 - CHROME_TOP_CROP_PX) - 620,
      y2: Math.round(2340 / 2 - CHROME_TOP_CROP_PX) + 620,
    },
    'audio-download': {
      // Chrome baseline: crop = CHROME_TOP_CROP_PX (3px). Dialog fills most of screen.
      x1: 50,
      x2: w - 50,
      y1: Math.round(2340 / 2 - CHROME_TOP_CROP_PX) - 940,
      y2: Math.round(2340 / 2 - CHROME_TOP_CROP_PX) + 630,
    },
    'dialog-select-theme': {
      // +20px inside left/right dialog edges to avoid scrim-over-reader bleed
      x1: Math.round((w - 280 * SCALE) / 2) + 20,
      x2: Math.round((w + 280 * SCALE) / 2) - 20,
      // -460/+510px from dialog center to cover title + 4 rows + footer + margin
      y1: Math.round(2340 / 2 - ANDROID_STATUS_BAR_PX) - 460,
      y2: Math.round(2340 / 2 - ANDROID_STATUS_BAR_PX) + 510,
    },
  }
  const dialogBox = DIALOG_BOX[screenId]
  let dialogArea = w * h
  if (dialogBox !== undefined) {
    const { x1, y1, x2, y2 } = dialogBox
    dialogArea = Math.max(1, (x2 - x1) * (y2 - y1))
    function maskOutsideDialog(png: PNG) {
      for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
          if (x < x1 || x >= x2 || y < y1 || y >= y2) {
            const i = (y * png.width + x) * 4
            png.data[i] = 255
            png.data[i + 1] = 255
            png.data[i + 2] = 255
            png.data[i + 3] = 255
          }
        }
      }
    }
    maskOutsideDialog(ref)
    maskOutsideDialog(candidate)
  }

  const diff = new PNG({ width: w, height: h })
  // threshold 0.2: tolerates device-display color rendering variance in images
  // while still catching layout errors (position, size, missing elements)
  const mismatch = pixelmatch(ref.data, candidate.data, diff.data, w, h, {
    threshold: 0.2,
    includeAA: false,
  })

  const total = maskEdge !== undefined ? maskEdge * h
    : dialogBox !== undefined ? dialogArea
    : w * h
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
