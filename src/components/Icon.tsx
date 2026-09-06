import type { SVGProps } from 'react'
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name:
    | 'dashboard'
    | 'file'
    | 'chevron'
    | 'back'
    | 'search'
    | 'menu'
    | 'close'
    | 'logout'
    | 'check'
    | 'refresh'
    | 'user'
}) {
  const paths = {
    dashboard: (
      <>
        <path d="M4 20h16a10 10 0 1 0-16 0Z" />
        <path d="m12 13 4-5M6 13h1M8 7l1 1M12 5v1M17 13h1" />
        <circle cx="12" cy="13" r="1.4" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l5 5v15H6Z" />
        <path d="M14 2v6h5M9 12h6M9 16h6" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
    back: <path d="m14 5-7 7 7 7" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    logout: (
      <>
        <path d="M10 4H4v16h6M10 12h11m-4-4 4 4-4 4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    refresh: (
      <>
        <path d="M20 8a9 9 0 1 0 .4 7M20 3v6h-6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
