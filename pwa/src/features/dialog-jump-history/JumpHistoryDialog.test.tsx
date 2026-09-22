import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JumpHistoryDialog } from './JumpHistoryDialog.tsx'
import type { SurahMeta } from '../../data/types.ts'
import type { JumpStep } from '../../hooks/useSurah.ts'

// jsdom's <dialog> modal methods vary by version; open it so contents are in the
// accessibility tree (role queries skip a closed dialog's hidden descendants).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false
  }
})

function meta(number: number, englishName: string): SurahMeta {
  return {
    number,
    name: '',
    englishName,
    englishNameTranslation: '',
    numberOfAyahs: 110,
    revelationType: 'Meccan',
    myanmarName: '',
  }
}

const surahs: SurahMeta[] = [meta(1, 'Al-Faatiha'), meta(10, 'Yunus')]

const history: JumpStep[] = [
  { surahId: 1, ayatId: 0 },
  { surahId: 10, ayatId: 57 },
  { surahId: 10, ayatId: 58 },
  { surahId: 10, ayatId: 59 },
]

const noop = () => {}

afterEach(cleanup)

describe('JumpHistoryDialog', () => {
  it('labels the first step, the middle steps and the current spot', () => {
    render(
      <JumpHistoryDialog
        history={history}
        surahs={surahs}
        onSelect={noop}
        onClear={noop}
        onClose={noop}
      />,
    )
    expect(screen.getByText('Jump History')).toBeInTheDocument()
    expect(screen.getByText('Original Reading Spot')).toBeInTheDocument()
    expect(screen.getByText('Jump Step 1')).toBeInTheDocument()
    expect(screen.getByText('Jump Step 2')).toBeInTheDocument()
    expect(screen.getByText('Current Spot')).toBeInTheDocument()
  })

  it('shows each position with its surah name', () => {
    render(
      <JumpHistoryDialog
        history={history}
        surahs={surahs}
        onSelect={noop}
        onClear={noop}
        onClose={noop}
      />,
    )
    expect(screen.getByText('‪[Surah 1 : Ayat 0]‬ Al-Faatiha')).toBeInTheDocument()
    expect(screen.getByText('‪[Surah 10 : Ayat 57]‬ Yunus')).toBeInTheDocument()
  })

  it('reports the index of the tapped row', async () => {
    const onSelect = vi.fn()
    render(
      <JumpHistoryDialog
        history={history}
        surahs={surahs}
        onSelect={onSelect}
        onClear={noop}
        onClose={noop}
      />,
    )
    await userEvent.click(screen.getByText('Jump Step 2'))
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('wires Clear History and Close', async () => {
    const onClear = vi.fn()
    const onClose = vi.fn()
    render(
      <JumpHistoryDialog
        history={history}
        surahs={surahs}
        onSelect={noop}
        onClear={onClear}
        onClose={onClose}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Clear History' }))
    expect(onClear).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
