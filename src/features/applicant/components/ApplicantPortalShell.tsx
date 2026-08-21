import { Link, useNavigate } from 'react-router-dom'
import type { ReactElement, ReactNode } from 'react'

import { useAuth } from '../../auth/AuthContext'

interface ApplicantPortalShellProps {
  activeItem: 'dashboard' | 'applications'
  children: ReactNode
}

export function ApplicantPortalShell({
  activeItem,
  children,
}: ApplicantPortalShellProps): ReactElement | null {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout(): void {
    logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="applicant-shell">
      <aside className="portal-sidebar">
        <Link className="portal-brand" to="/applicant" aria-label="GAP Applicant Portal">
          <img
            className="portal-brand__logo"
            src="/assets/gap-logo.png"
            alt=""
            aria-hidden="true"
          />
          <span>
            <strong>GAP</strong>
            <small>Applicant Portal</small>
          </span>
        </Link>

        <nav className="portal-navigation" aria-label="Applicant portal">
          <Link
            className={activeItem === 'dashboard' ? 'portal-nav-item is-active' : 'portal-nav-item'}
            to="/applicant"
          >
            Dashboard
          </Link>
          <Link
            className={activeItem === 'applications' ? 'portal-nav-item is-active' : 'portal-nav-item'}
            to="/applicant#applications"
          >
            My Applications
          </Link>
          <span className="portal-nav-item is-disabled">Assigned Greyhound</span>
          <span className="portal-nav-item is-disabled">Training Materials</span>
          <Link className="portal-nav-item" to="/applicant#profile">
            Profile
          </Link>
        </nav>

      </aside>

      <div className="portal-content">
        <header className="portal-topbar">
          <p>Welcome, {user.fullName}</p>
          <button className="portal-topbar__logout" type="button" onClick={handleLogout}>
            Log Out
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
