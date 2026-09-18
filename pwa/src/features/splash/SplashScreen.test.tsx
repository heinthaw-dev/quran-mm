import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { SplashScreen } from './SplashScreen.tsx'
import { cacheOfflineData } from '../../data/dataCache.ts'

vi.mock('../../data/dataCache.ts', () => ({
  cacheOfflineData: vi.fn(async () => {}),
}))

// jsdom has no FontFaceSet; the splash waits on it before dismissing.
function stubDisplayMode(standalone: boolean) {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve() },
  })
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: standalone && query.includes('standalone'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('SplashScreen', () => {
  beforeEach(() => vi.mocked(cacheOfflineData).mockClear())
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('warms the offline cache when launched as an installed app', () => {
    stubDisplayMode(true)
    render(<SplashScreen onDone={() => {}} />)
    expect(cacheOfflineData).toHaveBeenCalledTimes(1)
  })

  it('downloads nothing when opened in a browser tab', () => {
    stubDisplayMode(false)
    render(<SplashScreen onDone={() => {}} />)
    expect(cacheOfflineData).not.toHaveBeenCalled()
  })
})
