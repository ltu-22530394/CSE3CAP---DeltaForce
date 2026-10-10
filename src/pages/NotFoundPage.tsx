import { Link } from 'react-router-dom'
import type { ReactElement } from 'react'
import { ApplicantPortalShell } from '../applicant/features/applicant/components/ApplicantPortalShell'

export function NotFoundPage(): ReactElement {
  return (
    <ApplicantPortalShell>
      <main className="account-action placeholder-page">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>This page may have moved or is no longer available.</p>
        <Link className="primary-button" to="/">
          Return to home
        </Link>
      </main>
    </ApplicantPortalShell>
  )
}
