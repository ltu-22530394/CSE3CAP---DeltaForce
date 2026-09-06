import type { ReactElement, ReactNode } from 'react'

interface AlertProps {
  children?: ReactNode
  tone?: 'error' | 'success'
}

export function Alert({
  children,
  tone = 'error',
}: AlertProps): ReactElement | null {
  if (!children) return null

  return (
    <div
      className={`alert alert--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}
