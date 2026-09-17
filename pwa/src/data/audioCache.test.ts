import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getAudioObjectUrl } from './audioCache.ts'

describe('getAudioObjectUrl', () => {
  const url = 'https://host.test/audio/001/001001.mp3'
  let match: ReturnType<typeof vi.fn>

  beforeEach(() => {
    match = vi.fn(async () => undefined as Response | undefined)
    vi.stubGlobal('caches', { open: async () => ({ match }) })
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:stub' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('serves a downloaded ayat from Cache Storage without touching the network', async () => {
    match.mockResolvedValue(new Response(new Blob(['x']), { status: 200 }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await getAudioObjectUrl(url)).toBe('blob:stub')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to the network with the host headers on a cache miss', async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(['x']), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await getAudioObjectUrl(url)).toBe('blob:stub')
    expect(fetchMock).toHaveBeenCalledWith(url, expect.anything())
  })

  it('throws when the host refuses the file', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))
    await expect(getAudioObjectUrl(url)).rejects.toThrow('Audio unavailable (404)')
  })
})
