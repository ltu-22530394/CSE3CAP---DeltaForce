import { NavLink } from 'react-router-dom'
import type { ReactElement } from 'react'

interface AppHeaderProps {
  portalLabel?: string
  applicantName?: string
}

export function AppHeader({
  portalLabel = 'Greyhound Adoption Program',
  applicantName,
}: AppHeaderProps): ReactElement {
  return (
    <header className="site-header">
      <div className="brand" aria-label="Greyhound Adoption Program">
        <img className="brand__logo" src="/assets/gap-logo.png" alt="" aria-hidden="true" />
        <div>
          <p className="brand__name">GAP</p>
          <p className="brand__label">{portalLabel}</p>
        </div>
      </div>

      {applicantName ? (
        <p className="applicant-greeting">Welcome, {applicantName}</p>
      ) : (
        <nav className="auth-navigation" aria-label="Applicant access">
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `button-link ${isActive ? 'button-link--active' : ''}`
            }
          >
            Login
          </NavLink>
          <NavLink
            to="/register"
            className={({ isActive }) =>
              `button-link ${isActive ? 'button-link--active' : ''}`
            }
          >
            Register
          </NavLink>
        </nav>
      )}
    </header>
  )
}
