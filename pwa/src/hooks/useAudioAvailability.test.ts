import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { listDownloadedAyats } from '../data/audioCache.ts'
import { useAudioAvailability } from './useAudioAvailability.ts'
import type { AyatRow } from '../data/types.ts'

vi.mock('../data/audioCache.ts', () => ({
  ayatKey: (surah: number, ayat: number) => `${surah}:${ayat}`,
  listDownloadedAyats: vi.fn(async () => new Set<string>()),
  subscribeDownloadedAyats: () => () => {},
}))

const downloaded = vi.mocked(listDownloadedAyats)

const onDevice = (...keys: string[]) => {
  downloaded.mockResolvedValue(new Set(keys))
}

const row = (ayatId: number, multiAyats = ''): AyatRow => ({
  ayatId,
  mmTranslation: '',
  multiAyats,
})

beforeEach(() => { downloaded.mockReset() })

describe('useAudioAvailability', () => {
  it('needs every ayat of the surah plus the Bismillah head', async () => {
    onDevice('1:0', '18:1', '18:2')
    const { result } = renderHook(() => useAudioAvailability(18, 1, 2))

    await waitFor(() => expect(result.current.surahAvailable).toBe(true))
  })

  it('stays unavailable while one ayat is missing', async () => {
    onDevice('1:0', '18:1')
    const { result } = renderHook(() => useAudioAvailability(18, 1, 2))

    await waitFor(() => expect(downloaded).toHaveBeenCalled())
    expect(result.current.surahAvailable).toBe(false)
  })

  it('stays unavailable while the Bismillah head is missing', async () => {
    onDevice('18:1', '18:2')
    const { result } = renderHook(() => useAudioAvailability(18, 1, 2))

    await waitFor(() => expect(downloaded).toHaveBeenCalled())
    expect(result.current.surahAvailable).toBe(false)
  })

  // Surah 1's own ayat 0 is that file, and surah 9 has no Bismillah at all.
  it('asks for no head in surah 1 or surah 9', async () => {
    onDevice('1:0', '1:1')
    const first = renderHook(() => useAudioAvailability(1, 0, 1))
    await waitFor(() => expect(first.result.current.surahAvailable).toBe(true))

    onDevice('9:1')
    const ninth = renderHook(() => useAudioAvailability(9, 1, 1))
    await waitFor(() => expect(ninth.result.current.surahAvailable).toBe(true))
  })

  it('needs every file of a combined row, not just its anchor', async () => {
    onDevice('70:11', '70:12', '70:13')
    const { result } = renderHook(() => useAudioAvailability(70, 1, 44))

    await waitFor(() => expect(downloaded).toHaveBeenCalled())
    expect(result.current.isRowAvailable(row(11, '11-13'))).toBe(true)
    expect(result.current.isRowAvailable(row(11, '11-14'))).toBe(false)
    expect(result.current.isRowAvailable(row(15))).toBe(false)
  })
})
