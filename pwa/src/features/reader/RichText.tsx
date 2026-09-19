// Ports: buildAnnotatedString (MainActivity.kt:1762-1780)
import { FOOTNOTE_MARKER_RE, CROSSREF_RE, NOTE_LABEL_RE } from '../../hooks/useSurah.ts'
import styles from './RichText.module.css'

interface TranslationProps {
  text: string
  onJump?: (surahId: number, ayatId: number) => void
}

// Render mm_Translation (part before @) with footnote superscripts and cross-ref links
export function TranslationText({ text, onJump }: TranslationProps) {
  // Replace # with newline
  const normalized = text.replace(/#/g, '\n')

  const segments = tokenize(normalized, [
    { re: new RegExp(FOOTNOTE_MARKER_RE.source, 'g'), type: 'footnote' as const },
    { re: new RegExp(CROSSREF_RE.source, 'g'), type: 'crossref' as const },
  ])

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === 'footnote') {
          return (
            <sup key={i} className={styles.footnoteMarker}>
              {seg.text}
            </sup>
          )
        }
        if (seg.type === 'crossref') {
          return (
            <button
              key={i}
              className={styles.crossRef}
              onClick={() => onJump && parseCrossRef(seg.text, onJump)}
              type="button"
            >
              {seg.text}
            </button>
          )
        }
        // Plain text — preserve newlines
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{seg.text}</span>
      })}
    </span>
  )
}

interface NotesProps {
  text: string
  onJump?: (surahId: number, ayatId: number) => void
}

// Render explanation note text with [N] labels and [s:a] links
export function NotesText({ text, onJump }: NotesProps) {
  // Replace # with newline, like the translation text does
  const normalized = text.replace(/#/g, '\n')

  const segments = tokenize(normalized, [
    { re: new RegExp(NOTE_LABEL_RE.source, 'gm'), type: 'noteLabel' as const },
    { re: new RegExp(CROSSREF_RE.source, 'g'), type: 'crossref' as const },
  ])

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === 'noteLabel') {
          return (
            <strong key={i} className={styles.noteLabel}>
              {seg.text}
            </strong>
          )
        }
        if (seg.type === 'crossref') {
          return (
            <button
              key={i}
              className={styles.crossRef}
              onClick={() => onJump && parseCrossRef(seg.text, onJump)}
              type="button"
            >
              {seg.text}
            </button>
          )
        }
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{seg.text}</span>
      })}
    </span>
  )
}

type SegType = 'footnote' | 'crossref' | 'noteLabel' | 'plain'

interface Segment {
  text: string
  type: SegType
}

function tokenize(text: string, rules: { re: RegExp; type: SegType }[]): Segment[] {
  const combined: { start: number; end: number; text: string; type: SegType }[] = []

  for (const { re, type } of rules) {
    re.lastIndex = 0
    for (const m of text.matchAll(re)) {
      if (m.index !== undefined) {
        combined.push({ start: m.index, end: m.index + m[0].length, text: m[0], type })
      }
    }
  }

  combined.sort((a, b) => a.start - b.start)

  const segments: Segment[] = []
  let cursor = 0
  for (const match of combined) {
    if (match.start < cursor) continue
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), type: 'plain' })
    }
    segments.push({ text: match.text, type: match.type })
    cursor = match.end
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), type: 'plain' })
  }
  return segments
}

function parseCrossRef(ref: string, onJump: (s: number, a: number) => void) {
  const inner = ref.slice(1, -1)
  const colonIdx = inner.indexOf(':')
  if (colonIdx === -1) return
  const s = parseInt(inner.slice(0, colonIdx), 10)
  const aPart = inner.slice(colonIdx + 1).split(',')[0] ?? ''
  const a = parseInt(aPart, 10)
  if (!isNaN(s) && !isNaN(a)) onJump(s, a)
}
