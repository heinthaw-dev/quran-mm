import { describe, it, expect } from 'vitest'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const W = 100
const H = 100
const PASS_LIMIT = 0.01

function solidPNG(r: number, g: number, b: number): PNG {
  const png = new PNG({ width: W, height: H })
  for (let i = 0; i < W * H; i++) {
    png.data[i * 4] = r
    png.data[i * 4 + 1] = g
    png.data[i * 4 + 2] = b
    png.data[i * 4 + 3] = 255
  }
  return png
}

function shiftedPNG(base: PNG, dx: number, dy: number): PNG {
  const out = new PNG({ width: W, height: H })
  out.data.fill(255)
  PNG.bitblt(base, out, 0, 0, W - dx, H - dy, dx, dy)
  return out
}

function mismatchRatio(a: PNG, b: PNG): number {
  const diff = new PNG({ width: W, height: H })
  const n = pixelmatch(a.data, b.data, diff.data, W, H, { threshold: 0.1, includeAA: false })
  return n / (W * H)
}

describe('visual-check comparison logic', () => {
  it('identical images: 0% mismatch → PASS', () => {
    const img = solidPNG(100, 150, 200)
    const ratio = mismatchRatio(img, img)
    expect(ratio).toBe(0)
    expect(ratio).toBeLessThanOrEqual(PASS_LIMIT)
  })

  it('image shifted by 5px: mismatch > 1% → FAIL', () => {
    const img = solidPNG(50, 100, 150)
    const shifted = shiftedPNG(img, 5, 5)
    const ratio = mismatchRatio(img, shifted)
    expect(ratio).toBeGreaterThan(PASS_LIMIT)
  })

  it('completely different colors: 100% mismatch → FAIL', () => {
    const a = solidPNG(255, 0, 0)
    const b = solidPNG(0, 0, 255)
    const ratio = mismatchRatio(a, b)
    expect(ratio).toBeGreaterThan(PASS_LIMIT)
  })
})
