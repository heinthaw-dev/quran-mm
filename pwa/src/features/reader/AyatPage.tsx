// Ports: LazyColumn of three BlueprintCards per ayat page (MainActivity.kt:1729-1804)
import type { AyatRow, NoteRow, FontScale, SurahMeta } from '../../data/types.ts'
import {
  ContentCopyIcon,
  PlayArrowIcon,
  PauseIcon,
  PlaylistPlayIcon,
} from '../../ui/Icons.tsx'
import { BlueprintCard } from './BlueprintCard.tsx'
import { TranslationText, NotesText } from './RichText.tsx'
import styles from './AyatPage.module.css'

interface Props {
  surahId: number
  surah: SurahMeta | undefined
  row: AyatRow | undefined
  arabicText: string
  notesForPage: NoteRow[]
  arabicFontScale: FontScale
  myanmarFontScale: FontScale
  noteFontScale: FontScale
  audioPlaying: boolean
  audioLoaded: boolean
  onPlayAyat: () => void
  onPlaySurahFromHere: () => void
  onScaleArabic: (delta: -1 | 1) => void
  onScaleMyanmar: (delta: -1 | 1) => void
  onScaleNote: (delta: -1 | 1) => void
  onJump: (surahId: number, ayatId: number) => void
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => undefined)
}

function ScaleButtons({
  onMinus,
  onPlus,
}: {
  onMinus: () => void
  onPlus: () => void
}) {
  return (
    <>
      <button className={styles.scaleBtn} onClick={onMinus} type="button" aria-label="Decrease font">
        A-
      </button>
      <button className={styles.scaleBtn} onClick={onPlus} type="button" aria-label="Increase font">
        A+
      </button>
    </>
  )
}

function IconBtn({
  size,
  children,
  onClick,
  label,
  disabled,
  opacity,
}: {
  size: number
  children: React.ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
  opacity?: number
}) {
  return (
    <button
      className={styles.iconBtn}
      style={{ width: size, height: size, opacity }}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  )
}

export function AyatPage({
  surahId,
  surah,
  row,
  arabicText,
  notesForPage,
  arabicFontScale,
  myanmarFontScale,
  noteFontScale,
  audioPlaying,
  audioLoaded,
  onPlayAyat,
  onPlaySurahFromHere,
  onScaleArabic,
  onScaleMyanmar,
  onScaleNote,
  onJump,
}: Props) {
  const ayatId = row?.ayatId ?? 1
  const surahArabicName = surah?.name ?? ''
  // Card 1 title: Arabic surah name + [surahId:ayatId]
  const arabicTitle = `${surahArabicName} [${surahId}:${ayatId}]`

  const translationParts = row ? row.mmTranslation.split('@') : ['', '']
  const translationMain = translationParts[0] ?? ''
  const translationNote = translationParts[1] ?? ''

  const notesText = notesForPage.map((n) => `[${n.notesId}] ${n.explanation}`).join('\n\n')
  const hasNotes = notesForPage.length > 0

  return (
    <div className={styles.page}>
      {/* Card 1: Arabic */}
      <BlueprintCard
        title={arabicTitle}
        titleSize={13}
        actions={
          <>
            <IconBtn size={26} onClick={onPlayAyat} label="Play ayat" opacity={1}>
              {audioPlaying ? (
                <PauseIcon size={26} color="var(--color-primary)" />
              ) : (
                <PlayArrowIcon size={26} color="var(--color-primary)" />
              )}
            </IconBtn>
            <IconBtn
              size={26}
              onClick={onPlaySurahFromHere}
              label="Play surah from here"
              disabled={!audioLoaded}
              opacity={audioLoaded ? 1 : 0.3}
            >
              <PlaylistPlayIcon size={26} color="var(--color-primary)" />
            </IconBtn>
            <IconBtn size={20} onClick={() => copyText(arabicText)} label="Copy Arabic" opacity={1}>
              <ContentCopyIcon size={20} color="var(--color-primary)" />
            </IconBtn>
            <ScaleButtons onMinus={() => onScaleArabic(-1)} onPlus={() => onScaleArabic(1)} />
          </>
        }
      >
        <p
          className={styles.arabicText}
          dir="rtl"
          lang="ar"
          style={{ fontSize: `calc(var(--fs-arabic) * ${arabicFontScale})` }}
        >
          {arabicText}
        </p>
      </BlueprintCard>

      {/* Card 2: Myanmar Translation */}
      <BlueprintCard
        title="Myanmar Translation"
        titleSize={13}
        actions={
          <>
            <IconBtn
              size={20}
              onClick={() => copyText(row?.mmTranslation ?? '')}
              label="Copy translation"
              opacity={1}
            >
              <ContentCopyIcon size={20} color="var(--color-primary)" />
            </IconBtn>
            <ScaleButtons onMinus={() => onScaleMyanmar(-1)} onPlus={() => onScaleMyanmar(1)} />
          </>
        }
      >
        <p
          className={styles.bodyText}
          dir="auto"
          lang="my"
          style={{
            fontSize: `calc(var(--fs-body) * ${myanmarFontScale})`,
            lineHeight: `calc(var(--lh-body) * ${myanmarFontScale})`,
          }}
        >
          <TranslationText text={translationMain} onJump={onJump} />
          {translationNote && (
            <span className={styles.translationNote}>
              {'\n'}
              <span className={styles.translationNoteLabel}>Translation Note</span>
              {' '}
              {translationNote.trim()}
            </span>
          )}
        </p>
      </BlueprintCard>

      {/* Card 3: Explanation Notes (Tafsir) */}
      <BlueprintCard
        title="Explanation Notes (Tafsir)"
        titleSize={13}
        actions={
          <>
            <IconBtn
              size={20}
              onClick={() => copyText(notesText)}
              label="Copy notes"
              opacity={1}
            >
              <ContentCopyIcon size={20} color="var(--color-primary)" />
            </IconBtn>
            <ScaleButtons onMinus={() => onScaleNote(-1)} onPlus={() => onScaleNote(1)} />
          </>
        }
      >
        {hasNotes ? (
          <p
            className={styles.bodyText}
            dir="auto"
            style={{
              fontSize: `calc(var(--fs-body) * ${noteFontScale})`,
              lineHeight: `calc(var(--lh-body) * ${noteFontScale})`,
            }}
          >
            <NotesText text={notesText} onJump={onJump} />
          </p>
        ) : (
          <p className={styles.emptyNotes}>
            No Explanation Notes (Tafsir) for this Ayat.
            {'\n'}
            ဤ Ayat အတွက် အကျမ်ဖွင့်ရှင်းလင်းချက် မရှိပါ။
          </p>
        )}
      </BlueprintCard>
    </div>
  )
}
