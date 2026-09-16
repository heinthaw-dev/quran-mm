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
  return <Svg {...p}><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></Svg>
}

export function GpsFixedIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></Svg>
}

export function ContentCopyIcon(p: IconProps) {
  return <Svg {...p}><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></Svg>
}
