import { Link, NavLink } from 'react-router-dom'
import type { ReactElement } from 'react'

interface AppHeaderProps {
  portalLabel?: string
  applicantName?: string
  access?: 'applicant' | 'staff' | 'home'
}

export function AppHeader({
  portalLabel = 'Greyhound Adoption Program',
  applicantName,
  access = 'applicant',
}: AppHeaderProps): ReactElement {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="GAP home">
        <img
          className="brand__logo"
          src="/assets/gap-logo-blue.png"
          alt=""
          aria-hidden="true"
        />
        <div>
          <p className="brand__name">GAP</p>
          <p className="brand__label">{portalLabel}</p>
        </div>
      </Link>

      {applicantName ? (
        <p className="applicant-greeting">Welcome, {applicantName}</p>
      ) : access !== 'applicant' ? (
        <nav className="auth-navigation" aria-label="Public navigation">
          <NavLink
            className="button-link"
            to={access === 'home' ? '/fostering' : '/'}
          >
            {access === 'home' ? 'Fostering' : 'Home'}
          </NavLink>
        </nav>
      ) : (
        <nav className="auth-navigation" aria-label="Applicant access">
          <NavLink
            to="/applicant/login"
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
