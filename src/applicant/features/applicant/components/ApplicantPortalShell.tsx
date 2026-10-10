import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { useAuth } from '../../auth/AuthContext'

interface ApplicantPortalShellProps {
  children: ReactNode
}

export function ApplicantPortalShell({
  children,
}: ApplicantPortalShellProps): ReactElement | null {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAccountOpen) return undefined

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') setIsAccountOpen(false)
    }

    function closeOnOutsideClick(event: MouseEvent): void {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setIsAccountOpen(false)
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('mousedown', closeOnOutsideClick)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('mousedown', closeOnOutsideClick)
    }
  }, [isAccountOpen])

  function handleLogout(): void {
    setIsAccountOpen(false)
    logout()
    navigate('/applicant/login', { replace: true })
  }

  if (!user)
    return (
      <div className="applicant-shell">
        <header className="applicant-header">
          <Link className="portal-brand" to="/" aria-label="GAP home">
            <img
              className="portal-brand__logo"
              src="/assets/gap-logo-blue.png"
              alt="Greyhounds as Pets"
            />
            <strong>Greyhounds as Pets</strong>
          </Link>
          <Link to="/login">Sign in</Link>
        </header>
        <div className="portal-content">
          {children}
          <footer className="portal-links">
            <Link to="/fostering">Fostering information</Link>
            <Link to="/privacy">Privacy and terms</Link>
          </footer>
        </div>
      </div>
    )

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="applicant-shell">
      <header className="applicant-header">
        <Link
          className="portal-brand"
          to="/"
          aria-label="GAP home"
        >
          <img
            className="portal-brand__logo"
            src="/assets/gap-logo-blue.png"
            alt=""
            aria-hidden="true"
          />
          <span>
            <strong>GAP</strong>
            <small>Greyhound Adoption Program</small>
          </span>
        </Link>

        <div className="applicant-account" ref={accountRef}>
          <button
            className={`applicant-account__trigger${isAccountOpen ? ' is-open' : ''}`}
            type="button"
            aria-haspopup="dialog"
            aria-label={`Account menu for ${user.fullName}`}
            aria-expanded={isAccountOpen}
            aria-controls="applicant-account-dialog"
            onClick={() => setIsAccountOpen((isOpen) => !isOpen)}
          >
            <span className="applicant-account__avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="applicant-account__name">{user.fullName}</span>
            <span className="applicant-account__chevron" aria-hidden="true" />
          </button>

          {isAccountOpen && (
            <div
              className="applicant-account-dialog"
              id="applicant-account-dialog"
              role="dialog"
              aria-modal="false"
              aria-labelledby="applicant-account-dialog-title"
            >
              <p className="eyebrow">Account</p>
              <h2 id="applicant-account-dialog-title">{user.fullName}</h2>
              <p className="applicant-account-dialog__email">{user.email}</p>
              <Link
                to="/applicant/profile"
                onClick={() => setIsAccountOpen(false)}
              >
                My profile
              </Link>
              <button
                className="applicant-account-dialog__logout"
                type="button"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="portal-content">
        {children}
        <footer className="portal-links">
          <Link to="/applicant/profile">My profile</Link>
          <Link to="/privacy">Privacy and terms</Link>
        </footer>
      </div>
    </div>
  )
}
