// One media resource for a whole run of ayats.
//
// Device logs: a page that has been in the background for 15-20 s is refused the
// *next* audio file — Chrome starts it, then pauses it after a tenth of a second
// (see docs/PARITY.md, audio playback row). Playing a surah as one joined file
// survived both a locked screen and the home screen, so the cure is to stop
// handing the element new files. This streams that single resource through
// MediaSource: the first ayat starts playback, the rest are appended to the same
// buffer while it plays, so a long surah does not have to be fetched up front.
import { getAudioBlob } from './audioCache.ts'
import { audioLog } from './audioLog.ts'

const MIME = 'audio/mpeg'
// How far ahead of the playhead to keep the buffer filled. Long enough that a
// throttled background fetch cannot starve playback, short enough that a 286
// ayat surah is not pulled down in one go.
const LOOKAHEAD_SECONDS = 60
const POLL_MS = 500
// Dropped from the front when the buffer is full, keeping a little history for
// the lock screen's "previous" button.
const EVICT_KEEP_SECONDS = 20

export interface StreamTrack {
  surah: number
  ayat: number
  /** Ayat id the reader highlights while this file plays. The Bismillah head
   *  carries the following ayat's id, as Android does (MainActivity.kt:834). */
  highlight: number
}

export interface AyatSpan {
  ayat: number
  start: number
  end: number
}

export interface AudioStream {
  /** Assign to the element's src — it stays the same for the whole run. */
  url: string
  /** Appended so far, in playback order. */
  spans: () => AyatSpan[]
  close: () => void
}

export function canStreamAudio(): boolean {
  return typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(MIME)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

// ID3v2 is "ID3", 2 version bytes, flags, then 4 synchsafe length bytes. Every
// ayat file here carries one (2 KB), and a tag arriving mid-stream is not what
// the demuxer expects.
function stripId3(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 10) return bytes
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return bytes
  const size =
    ((bytes[6] ?? 0) & 0x7f) << 21 |
    ((bytes[7] ?? 0) & 0x7f) << 14 |
    ((bytes[8] ?? 0) & 0x7f) << 7 |
    ((bytes[9] ?? 0) & 0x7f)
  const footer = ((bytes[5] ?? 0) & 0x10) !== 0 ? 10 : 0
  const audioStart = 10 + size + footer
  return audioStart < bytes.length ? bytes.subarray(audioStart) : bytes
}

function bufferedEnd(buffer: SourceBuffer): number {
  const ranges = buffer.buffered
  return ranges.length > 0 ? ranges.end(ranges.length - 1) : 0
}

function whenIdle(buffer: SourceBuffer): Promise<void> {
  if (!buffer.updating) return Promise.resolve()
  return new Promise((resolve) => {
    buffer.addEventListener('updateend', () => { resolve() }, { once: true })
  })
}

export function openAudioStream(
  tracks: StreamTrack[],
  playhead: () => number,
): AudioStream {
  const media = new MediaSource()
  const url = URL.createObjectURL(media)
  const spans: AyatSpan[] = []
  let closed = false

  const evict = async (buffer: SourceBuffer) => {
    const keepFrom = playhead() - EVICT_KEEP_SECONDS
    if (keepFrom <= 0) return
    await whenIdle(buffer)
    if (closed) return
    buffer.remove(0, keepFrom)
    await whenIdle(buffer)
    audioLog('stream evict', `< ${keepFrom.toFixed(0)}s`)
  }

  const append = async (buffer: SourceBuffer, bytes: Uint8Array) => {
    await whenIdle(buffer)
    if (closed) return
    try {
      buffer.appendBuffer(bytes as BufferSource)
    } catch (err) {
      if (!(err instanceof DOMException) || err.name !== 'QuotaExceededError') throw err
      await evict(buffer)
      if (closed) return
      buffer.appendBuffer(bytes as BufferSource)
    }
    await whenIdle(buffer)
  }

  const appendAll = async (buffer: SourceBuffer) => {
    for (const track of tracks) {
      // Stay ahead of the playhead, not ahead of the whole surah.
      while (!closed && bufferedEnd(buffer) - playhead() > LOOKAHEAD_SECONDS) {
        await delay(POLL_MS)
      }
      if (closed) return
      try {
        const blob = await getAudioBlob(track.surah, track.ayat)
        const bytes = stripId3(new Uint8Array(await blob.arrayBuffer()))
        if (closed) return
        const start = bufferedEnd(buffer)
        await append(buffer, bytes)
        if (closed) return
        const end = bufferedEnd(buffer)
        spans.push({ ayat: track.highlight, start, end })
        audioLog('stream append', `${track.surah}:${track.ayat} ${start.toFixed(1)}-${end.toFixed(1)}s`)
      } catch (err) {
        // One unreachable ayat must not end the surah: skip it and carry on.
        audioLog('stream append fail', `${track.surah}:${track.ayat} ${String(err)}`)
      }
    }
    if (closed || media.readyState !== 'open') return
    try {
      media.endOfStream()
      audioLog('stream complete', `${spans.length} ayats`)
    } catch {
      // Already closed or ended by the element.
    }
  }

  media.addEventListener('sourceopen', () => {
    if (closed) return
    try {
      const buffer = media.addSourceBuffer(MIME)
      buffer.mode = 'sequence'
      void appendAll(buffer)
    } catch (err) {
      audioLog('stream open fail', String(err))
    }
  }, { once: true })

  return {
    url,
    spans: () => spans,
    close() {
      if (closed) return
      closed = true
      try {
        if (media.readyState === 'open') media.endOfStream()
      } catch {
        // Nothing to end.
      }
      URL.revokeObjectURL(url)
    },
  }
}
