import { copyFileSync, mkdirSync, existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ttf2woff2 from 'ttf2woff2'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const projectRoot = join(root, '..')
const assetsDir = join(projectRoot, 'assets')
const dataOut = join(root, 'public/data')
const fontsOut = join(root, 'public/fonts')

mkdirSync(dataOut, { recursive: true })
mkdirSync(fontsOut, { recursive: true })

// Copy all assets/ files to public/data/
const files = readdirSync(assetsDir)
let copied = 0
for (const f of files) {
  copyFileSync(join(assetsDir, f), join(dataOut, f))
  copied++
}
console.log(`✓ ${copied} asset files → public/data/`)

// TTF sources from Google Fonts (fetched with modern UA to get woff2 via v44/v27)
const FONTS: { name: string; ttfUrl: string }[] = [
  {
    name: 'NotoNaskhArabic-Regular.woff2',
    ttfUrl:
      'https://fonts.gstatic.com/s/notonaskharabic/v44/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwvc5krA.ttf',
  },
  {
    name: 'NotoNaskhArabic-Bold.woff2',
    ttfUrl:
      'https://fonts.gstatic.com/s/notonaskharabic/v44/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwWslkrA.ttf',
  },
  {
    name: 'NotoSansMyanmar-Regular.woff2',
    ttfUrl:
      'https://fonts.gstatic.com/s/notosansmyanmar/v27/AlZU_y1ZtY3ymOryg38hOCSdOnFq0FP9_gnYM_ME0QeqLzz8-kqmtY3KLEbEGTOZltU.ttf',
  },
  {
    name: 'NotoSansMyanmar-Bold.woff2',
    ttfUrl:
      'https://fonts.gstatic.com/s/notosansmyanmar/v27/AlZU_y1ZtY3ymOryg38hOCSdOnFq0FP9_gnYM_ME0QeqLzz8-kqmtY3KLEbEGdSeltU.ttf',
  },
]

let downloaded = 0
for (const font of FONTS) {
  const dest = join(fontsOut, font.name)
  if (existsSync(dest)) {
    console.log(`  (skip) ${font.name} already present`)
    continue
  }
  console.log(`  downloading + converting ${font.name}...`)
  try {
    const res = await fetch(font.ttfUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ttfBuf = Buffer.from(await res.arrayBuffer())
    const woff2Buf = ttf2woff2(ttfBuf)
    writeFileSync(dest, woff2Buf)
    console.log(`  ✓ ${font.name}`)
    downloaded++
  } catch (err) {
    console.error(`  ✗ ${font.name}: ${err}`)
    console.error('    Place the WOFF2 file manually in pwa/public/fonts/')
  }
}
if (downloaded > 0) console.log(`✓ ${downloaded} fonts → public/fonts/`)
