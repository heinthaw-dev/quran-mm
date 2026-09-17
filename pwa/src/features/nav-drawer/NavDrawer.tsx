// Ports: ModalNavigationDrawer content (MainActivity.kt:1309)
import { useNavigate } from 'react-router-dom'
import type { AppPrefs } from '../../data/types.ts'
import {
  DownloadForOfflineIcon,
  DeleteIcon,
  CreateIcon,
  ArrowForwardIcon,
  CheckCircleIcon,
  ListIcon,
  PersonIcon,
  BuildIcon,
  InfoIcon,
  CloseIcon,
} from '../../ui/Icons.tsx'
import styles from './NavDrawer.module.css'

interface Props {
  open: boolean
  prefs: AppPrefs
  onClose: () => void
  onPrefsUpdate: (patch: Partial<AppPrefs>) => void
  onDownloads: () => void
  onDeleteDownloads: () => void
  onSelectTheme: () => void
  onAbout: () => void
}

function SectionLabel({ children }: { children: string }) {
  return <div className={styles.sectionLabel}>{children}</div>
}

function DrawerDivider({ spaced }: { spaced?: boolean }) {
  return <hr className={spaced ? styles.dividerSpaced : styles.divider} />
}

interface RowProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  trailing?: React.ReactNode
  onClick?: () => void
}

function MenuRow({ icon, title, subtitle, trailing, onClick }: RowProps) {
  return (
    <button className={styles.row} onClick={onClick} type="button">
      <span className={styles.rowIcon}>{icon}</span>
      <div className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {subtitle !== undefined && <span className={styles.rowSubtitle}>{subtitle}</span>}
      </div>
      {trailing !== undefined && <div className={styles.rowTrailing}>{trailing}</div>}
    </button>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.toggle}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className={styles.toggleThumb} />
    </button>
  )
}

export function NavDrawer({
  open,
  prefs,
  onClose,
  onPrefsUpdate,
  onDownloads,
  onDeleteDownloads,
  onSelectTheme,
  onAbout,
}: Props) {
  const navigate = useNavigate()

  function goInfo(page: string) {
    navigate(`/info/${page}`)
    onClose()
  }

  return (
    <>
      <div
        className={`${styles.backdrop}${open ? ` ${styles.backdropVisible}` : ''}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`${styles.drawer}${open ? ` ${styles.drawerOpen}` : ''}`}
        aria-label="App menu"
        aria-modal={open || undefined}
        aria-hidden={!open}
        {...(!open && { inert: true })}
      >
        {/* Header: white bg, centered, top=32 bottom=24 h=24 padding */}
        <div className={styles.header}>
          <img src="/kw_logo.png" className={styles.logo} alt="" />
          <span className={styles.headerTitle}>မြန်မာ ကုရ်အာန် ဘာသာပြန်</span>
          <span className={styles.headerSubtitle}>ဆရာ ဦးကျော်ဝင်း</span>
        </div>
        <DrawerDivider />

        {/* Body: scrollable, theme.bg */}
        <div className={styles.body}>
          <div className={styles.spacer8} />

          <SectionLabel>Audio Files</SectionLabel>
          <MenuRow
            icon={<DownloadForOfflineIcon size={24} color="var(--color-primary)" />}
            title="Downloads"
            onClick={onDownloads}
          />
          <MenuRow
            icon={<DeleteIcon size={24} color="var(--color-primary)" />}
            title="Delete Downloads"
            onClick={onDeleteDownloads}
          />

          <DrawerDivider spaced />

          <SectionLabel>App Settings</SectionLabel>
          <MenuRow
            icon={<CreateIcon size={24} color="var(--color-primary)" />}
            title="App Theme"
            subtitle={prefs.theme}
            onClick={onSelectTheme}
          />
          <MenuRow
            icon={<ArrowForwardIcon size={24} color="var(--color-primary)" />}
            title="Continuous Swiping"
            trailing={
              <Toggle
                checked={prefs.continuousSwiping}
                onChange={(v) => onPrefsUpdate({ continuousSwiping: v })}
                label="Continuous Swiping"
              />
            }
          />
          <MenuRow
            icon={<CheckCircleIcon size={24} color="var(--color-primary)" />}
            title="Save Reading Position"
            trailing={
              <Toggle
                checked={prefs.rememberLastRead}
                onChange={(v) => onPrefsUpdate({ rememberLastRead: v })}
                label="Save Reading Position"
              />
            }
          />

          <DrawerDivider spaced />

          <SectionLabel>{"Translator's Info"}</SectionLabel>
          <MenuRow
            icon={<ListIcon size={24} color="var(--color-primary)" />}
            title="Preface"
            onClick={() => goInfo('preface')}
          />
          <MenuRow
            icon={<ListIcon size={24} color="var(--color-primary)" />}
            title="Introduction"
            onClick={() => goInfo('introduction')}
          />
          <MenuRow
            icon={<PersonIcon size={24} color="var(--color-primary)" />}
            title="Biography"
            onClick={() => goInfo('biography')}
          />

          <DrawerDivider spaced />

          <MenuRow
            icon={<BuildIcon size={24} color="var(--color-primary)" />}
            title="Developer"
            onClick={() => goInfo('developer')}
          />
          <MenuRow
            icon={<InfoIcon size={24} color="var(--color-primary)" />}
            title="About App"
            onClick={onAbout}
          />

          <DrawerDivider spaced />

          <MenuRow
            icon={<CloseIcon size={24} color="var(--color-primary)" />}
            title="Exit App"
            onClick={() => window.close()}
          />

          <div className={styles.spacer16} />
        </div>
      </aside>
    </>
  )
}
