import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DownloadProgressDialog } from './DownloadProgressDialog.tsx'
import type { DownloadProgress } from '../../data/audioDownload.ts'

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

const progress: DownloadProgress = {
  surahIndex: 1,
  surahTotal: 3,
  currentSurahId: 2,
  ayatDone: 55,
  ayatTotal: 286,
  etaSeconds: 203, // 03:23
}

const noop = () => {}

afterEach(cleanup)

describe('DownloadProgressDialog', () => {
  it('renders the native progress lines and formatted ETA', () => {
    render(
      <DownloadProgressDialog progress={progress} paused={false} onTogglePause={noop} onStop={noop} />,
    )
    expect(screen.getByText('Downloading Audio')).toBeInTheDocument()
    expect(screen.getByText('Surah Progress: 1 / 3')).toBeInTheDocument()
    expect(screen.getByText('(Downloading Surah 2)')).toBeInTheDocument()
    expect(screen.getByText('Ayat Progress: 55 / 286')).toBeInTheDocument()
    expect(screen.getByText('ETA: 03:23 mins remaining')).toBeInTheDocument()
  })

  it('shows "Calculating..." before an ETA is known', () => {
    render(
      <DownloadProgressDialog
        progress={{ ...progress, etaSeconds: null }}
        paused={false}
        onTogglePause={noop}
        onStop={noop}
      />,
    )
    expect(screen.getByText('ETA: Calculating...')).toBeInTheDocument()
  })

  it('labels the pause button "Resume" while paused', () => {
    render(<DownloadProgressDialog progress={progress} paused onTogglePause={noop} onStop={noop} />)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
  })

  it('fires the pause and stop callbacks', async () => {
    const onTogglePause = vi.fn()
    const onStop = vi.fn()
    render(
      <DownloadProgressDialog
        progress={progress}
        paused={false}
        onTogglePause={onTogglePause}
        onStop={onStop}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }))
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onTogglePause).toHaveBeenCalledOnce()
    expect(onStop).toHaveBeenCalledOnce()
  })
})
