// Ports: Material Design icons used across the app
interface IconProps {
  size?: number
  color?: string
  className?: string
  'aria-hidden'?: boolean
}

function Svg({ size = 24, color = 'currentColor', className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function MenuIcon(p: IconProps) {
  return <Svg {...p}><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></Svg>
}

export function ArrowBackIcon(p: IconProps) {
  return <Svg {...p}><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></Svg>
}

export function ChevronLeftIcon(p: IconProps) {
  return <Svg {...p}><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></Svg>
}

export function ChevronRightIcon(p: IconProps) {
  return <Svg {...p}><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></Svg>
}

export function RefreshIcon(p: IconProps) {
  return <Svg {...p}><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></Svg>
}

export function PlayArrowIcon(p: IconProps) {
  return <Svg {...p}><path d="M8 5v14l11-7z"/></Svg>
}

export function PauseIcon(p: IconProps) {
  return <Svg {...p}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></Svg>
}

export function PlaylistPlayIcon(p: IconProps) {
  return <Svg {...p}><path d="M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z"/></Svg>
}

export function GpsNotFixedIcon(p: IconProps) {
  return <Svg {...p}><path d="M20.94 11c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></Svg>
}

export function GpsFixedIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></Svg>
}

export function ContentCopyIcon(p: IconProps) {
  return <Svg {...p}><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></Svg>
}

// Nav drawer icons
export function DownloadForOfflineIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2 9.5V8h-4v3.5H7.5L12 16l4.5-4.5H14z"/></Svg>
}

export function DeleteIcon(p: IconProps) {
  return <Svg {...p}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></Svg>
}

export function CreateIcon(p: IconProps) {
  return <Svg {...p}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></Svg>
}

export function ArrowForwardIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></Svg>
}

export function CheckCircleIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></Svg>
}

export function ListIcon(p: IconProps) {
  return <Svg {...p}><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></Svg>
}

export function PersonIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></Svg>
}

export function BuildIcon(p: IconProps) {
  return <Svg {...p}><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></Svg>
}

export function InfoIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></Svg>
}

export function CloseIcon(p: IconProps) {
  return <Svg {...p}><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></Svg>
}
