// Solid, padel-specific glyphs drawn for this dashboard (instead of generic
// outline icon-set shapes). All use currentColor.

type P = { size?: number; className?: string }

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  className,
  'aria-hidden': true as const,
})

/** Top-down padel court: walls, net, service lines. */
export function CourtIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path fillRule="evenodd" d="M4 2.5h16A1.5 1.5 0 0 1 21.5 4v16a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 20V4A1.5 1.5 0 0 1 4 2.5Zm1 2.5v5.6h6.2V7H13v3.6H19V5H5Zm0 8.4V19h14v-5.6h-6v3.6h-1.8v-3.6H5Z" />
    </svg>
  )
}

/** Sun high in the sky — peak hours. */
export function PeakIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="4.6" />
      <path d="M11 1.8h2v3h-2zM11 19.2h2v3h-2zM1.8 11h3v2h-3zM19.2 11h3v2h-3zM4.1 5.5l1.4-1.4 2.1 2.1-1.4 1.4zM16.4 17.8l1.4-1.4 2.1 2.1-1.4 1.4zM4.1 18.5l2.1-2.1 1.4 1.4-2.1 2.1zM16.4 6.2l2.1-2.1 1.4 1.4-2.1 2.1z" />
    </svg>
  )
}

/** Crescent — off-peak hours. */
export function OffPeakIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M14.2 2.3A9.6 9.6 0 1 0 21.7 14a7.8 7.8 0 0 1-7.5-11.7Z" />
    </svg>
  )
}

/** Pennant on a pole — top zone. */
export function FlagIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 2h2v20H5z" />
      <path d="M8 3.2 19.5 7.6 8 12z" />
    </svg>
  )
}

/** Perforated padel racket — top club. */
export function RacketIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path
        fillRule="evenodd"
        d="M13.5 1.5a7 7 0 0 1 4.95 11.95 7 7 0 0 1-6.3 1.9l-1.9 1.9.7.7-1.4 1.4-.7-.7-3.2 3.2a1.5 1.5 0 0 1-2.1 0l-.5-.5a1.5 1.5 0 0 1 0-2.1l3.2-3.2-.7-.7 1.4-1.4.7.7 1.9-1.9a7 7 0 0 1 8.05-10.25ZM12 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-3 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-3-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
      />
    </svg>
  )
}

/** Stacked coins — revenue. */
export function CoinsIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <ellipse cx="9" cy="6" rx="6.5" ry="3" />
      <path d="M2.5 8.6c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v2.4c0 1.7-2.9 3-6.5 3s-6.5-1.3-6.5-3Z" />
      <path d="M2.5 13.6c0 1.7 2.9 3 6.5 3 .5 0 1 0 1.5-.1v2.4l-1.5.1c-3.6 0-6.5-1.3-6.5-3Z" />
      <circle cx="16.5" cy="16.5" r="5.5" />
    </svg>
  )
}

export function SunIcon({ size = 14, className }: P) {
  return <PeakIcon size={size} className={className} />
}

export function MoonIcon({ size = 14, className }: P) {
  return <OffPeakIcon size={size} className={className} />
}

export function RefreshIcon({ size = 14, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4a8 8 0 0 1 7.4 5H22l-3.5 4.5L15 9h2.2A5.9 5.9 0 0 0 6.2 10.5L4.2 10A8 8 0 0 1 12 4Zm-7.4 11H2l3.5-4.5L9 15H6.8a5.9 5.9 0 0 0 11-1.5l2 .5A8 8 0 0 1 4.6 15Z" />
    </svg>
  )
}

export function AlertIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path fillRule="evenodd" d="M10.3 3.2a2 2 0 0 1 3.4 0l8.4 14.6a2 2 0 0 1-1.7 3H3.6a2 2 0 0 1-1.7-3Zm.6 5.3h2.2l-.3 6h-1.6Zm1.1 7.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" />
    </svg>
  )
}

export function TrashIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 2.5h6l.8 1.5H20v2.2H4V4h4.2ZM5.5 7.5h13l-1 12.6A2 2 0 0 1 15.5 22h-7a2 2 0 0 1-2-1.9Zm4 2.5v9h1.8v-9Zm3.2 0v9h1.8v-9Z" />
    </svg>
  )
}

export function ShieldIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 1.8 20.5 5v6.2c0 5.2-3.6 9.7-8.5 11-4.9-1.3-8.5-5.8-8.5-11V5Zm-1.1 13.9 5.6-5.6-1.5-1.5-4.1 4.1-2-2-1.5 1.5Z" />
    </svg>
  )
}

export function SearchIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path fillRule="evenodd" d="M10.5 2.5a8 8 0 0 1 6.4 12.8l4.6 4.6-1.6 1.6-4.6-4.6A8 8 0 1 1 10.5 2.5Zm0 2.3a5.7 5.7 0 1 0 0 11.4 5.7 5.7 0 0 0 0-11.4Z" />
    </svg>
  )
}

/** Court outline — the dashboard home. */
export function HomeIcon({ size = 16, className }: P) {
  return <CourtIcon size={size} className={className} />
}

export function UsersIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9" cy="7.5" r="4" />
      <path d="M1.5 20.5c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7Z" />
      <path d="M15.6 3.8a4 4 0 0 1 0 7.4 5.6 5.6 0 0 0 0-7.4ZM17.4 13.7c3 .6 5.1 3.1 5.1 6.8h-4.3c0-2.7-.3-4.9-.8-6.8Z" />
    </svg>
  )
}

export function UploadIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 2.5 18 8.6l-1.6 1.6-3.3-3.3v9.3h-2.2V6.9L7.6 10.2 6 8.6ZM3.5 15h2.2v4.3h12.6V15h2.2v6.5h-17Z" />
    </svg>
  )
}

export function LogoutIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 3h9v2.2H6.2v13.6H13V21H4ZM16.4 7.2l4.8 4.8-4.8 4.8-1.6-1.6 2.1-2.1H9.5v-2.2h7.4l-2.1-2.1Z" />
    </svg>
  )
}

export function ClockIcon({ size = 16, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path fillRule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-1.1 4.5v6.3l4.6 2.8 1.1-1.9-3.5-2.1V6.5Z" />
    </svg>
  )
}
