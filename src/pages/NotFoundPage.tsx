import { Link } from 'react-router-dom'
import type { ReactElement } from 'react'

export function NotFoundPage(): ReactElement {
  return (
    <main className="placeholder-page">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <Link to="/login">Return to applicant login</Link>
    </main>
  )
}
