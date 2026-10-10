import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppHeader } from '../applicant/components/AppHeader'
import { ApplicantPortalShell } from '../applicant/features/applicant/components/ApplicantPortalShell'
import { useAuth } from '../applicant/features/auth/AuthContext'
import { staffUser } from '../api/seed'
import { StaffShell } from './StaffShell'

vi.mock('../applicant/features/auth/AuthContext', () => ({ useAuth: vi.fn() }))

function render(page: ReactElement, path = '/applicant/login') {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isAuthenticated: false,
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  })
})

describe('logo home navigation', () => {
  it.each(['home', 'applicant', 'staff'] as const)(
    'links the %s public header logo home',
    (access) => {
      const markup = render(<AppHeader access={access} />)
      expect(markup).toContain('class="brand" aria-label="GAP home" href="/"')
      expect(markup).toContain('/assets/gap-logo-blue.png')
    },
  )

  it('links the signed-out applicant shell logo home', () => {
    const markup = render(<ApplicantPortalShell>Help</ApplicantPortalShell>)
    expect(markup).toContain(
      'class="portal-brand" aria-label="GAP home" href="/"',
    )
  })

  it('links the signed-in applicant shell logo home without logging out', () => {
    const logout = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      ...useAuth(),
      user: {
        id: 'applicant',
        fullName: 'Test Applicant',
        email: 'applicant@example.test',
      },
      isAuthenticated: true,
      logout,
    })
    const markup = render(
      <ApplicantPortalShell>Dashboard</ApplicantPortalShell>,
      '/applicant',
    )
    expect(markup).toContain(
      'class="portal-brand" aria-label="GAP home" href="/"',
    )
    expect(logout).not.toHaveBeenCalled()
  })

  it('links both staff desktop and mobile branding home', () => {
    const logout = vi.fn()
    const markup = render(
      <StaffShell user={staffUser} logout={logout} />,
      '/staff',
    )
    const links = markup.match(
      /<a\b[^>]*aria-label="GAP home"[^>]*href="\/"[^>]*>/g,
    )
    expect(links).toHaveLength(2)
    expect(markup).toContain('/assets/greyhound-mark-blue.png')
    expect(logout).not.toHaveBeenCalled()
  })
})
