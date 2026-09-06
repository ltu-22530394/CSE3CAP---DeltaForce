import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { StaffUser } from '../api/model'
import { initials } from '../api/model'
import { Brand } from './Brand'
import { Icon } from './Icon'

export function StaffShell({
  user,
  logout,
}: {
  user: StaffUser
  logout: () => void
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const profile = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const mobileTrigger = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const main = useRef<HTMLElement>(null)
  const sidebar = useRef<HTMLElement>(null)
  useEffect(() => {
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [location.pathname])
  useEffect(() => {
    if (!profileOpen) return
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const outside = (e: PointerEvent) => {
      if (!profile.current?.contains(e.target as Node)) setProfileOpen(false)
    }
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyboard)
    }
  }, [profileOpen])
  useEffect(() => {
    if (!navigationOpen) return
    sidebar.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNavigationOpen(false)
        mobileTrigger.current?.focus()
      }
      if (e.key === 'Tab') {
        const items = sidebar.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled)',
        )
        if (items?.length) {
          const first = items[0],
            last = items[items.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
          if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigationOpen])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)')
    const reset = () => {
      if (media.matches) setNavigationOpen(false)
    }
    media.addEventListener('change', reset)
    return () => media.removeEventListener('change', reset)
  }, [])
  return (
    <div className={`staff-shell${navigationOpen ? ' nav-open' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="mobile-header">
        <button
          ref={mobileTrigger}
          className="icon-button"
          aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navigationOpen}
          aria-controls="staff-navigation"
          onClick={() => setNavigationOpen((v) => !v)}
        >
          <Icon name={navigationOpen ? 'close' : 'menu'} />
        </button>
        <span>GAP</span>
      </header>
      {navigationOpen && (
        <button
          className="navigation-scrim"
          aria-label="Close navigation"
          onClick={() => {
            setNavigationOpen(false)
            mobileTrigger.current?.focus()
          }}
        />
      )}
      <aside
        ref={sidebar}
        className="sidebar"
        id="staff-navigation"
        aria-label="Staff navigation"
      >
        <NavLink
          className="brand"
          to="/staff"
          aria-label="GAP home"
          onClick={() => setNavigationOpen(false)}
        >
          <Brand />
        </NavLink>
        <nav className="nav-list" aria-label="Main navigation">
          <NavLink
            end
            to="/staff"
            onClick={() => setNavigationOpen(false)}
            className={({ isActive }) =>
              `nav-item${isActive ? ' selected' : ''}`
            }
          >
            <Icon name="dashboard" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/staff/applications"
            onClick={() => setNavigationOpen(false)}
            className={({ isActive }) =>
              `nav-item${isActive ? ' selected' : ''}`
            }
          >
            <Icon name="file" />
            <span>Applications</span>
          </NavLink>
        </nav>
        <div
          className="profile-area"
          ref={profile}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setProfileOpen(false)
          }}
        >
          {profileOpen && (
            <div className="profile-menu" id="profile-menu" ref={menu}>
              <p>{user.email}</p>
              <button
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/staff/profile')
                  setNavigationOpen(false)
                }}
              >
                <Icon name="user" />
                My profile
              </button>
              <button onClick={logout}>
                <Icon name="logout" />
                Log out
              </button>
            </div>
          )}
          <button
            className="profile-trigger"
            ref={trigger}
            aria-expanded={profileOpen}
            aria-controls="profile-menu"
            onClick={() => setProfileOpen((v) => !v)}
          >
            <span className="avatar profile-avatar">{initials(user.name)}</span>
            <span className="profile-copy">
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </span>
            <Icon name="chevron" className={profileOpen ? 'rotated' : ''} />
          </button>
        </div>
      </aside>
      <main
        className="workspace"
        id="main"
        tabIndex={-1}
        ref={main}
        inert={navigationOpen}
      >
        <Outlet />
      </main>
    </div>
  )
}
