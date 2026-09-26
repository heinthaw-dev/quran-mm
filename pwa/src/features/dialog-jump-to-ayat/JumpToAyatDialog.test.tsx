import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JumpToAyatDialog } from './JumpToAyatDialog.tsx'

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

afterEach(cleanup)

function open(surahId: number, totalAyats: number) {
  const onGo = vi.fn()
  render(
    <JumpToAyatDialog
      surahId={surahId}
      totalAyats={totalAyats}
      surahName=""
      onGo={onGo}
      onClose={() => {}}
    />,
  )
  return onGo
}

async function typeAndGo(value: string) {
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText('Enter Ayat Number'), value)
  await user.click(screen.getByRole('button', { name: 'Go' }))
}

describe('JumpToAyatDialog', () => {
  it('accepts ayat 0 in surah 1 — its basmala is a page of its own', async () => {
    const onGo = open(1, 6)
    await typeAndGo('0')
    expect(onGo).toHaveBeenCalledWith(0)
  })

  it('rejects ayat 0 in every other surah', async () => {
    const onGo = open(2, 286)
    await typeAndGo('0')
    expect(onGo).not.toHaveBeenCalled()
  })

  it('rejects an id past the surah total', async () => {
    const onGo = open(1, 6)
    await typeAndGo('7')
    expect(onGo).not.toHaveBeenCalled()
  })

  it('accepts an ordinary id', async () => {
    const onGo = open(1, 6)
    await typeAndGo('4')
    expect(onGo).toHaveBeenCalledWith(4)
  })
})
