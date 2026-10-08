import { useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'

import { AppHeader } from '../../../components/AppHeader'
import { LoginForm } from '../components/LoginForm'
import { RegisterForm } from '../components/RegisterForm'
import type { PortalAudience } from '../authTypes'

export function AuthPage({
  audience,
}: {
  audience?: PortalAudience
}): ReactElement {
  const { pathname } = useLocation()
  const isRegisterPage = pathname === '/register'

  return (
    <div className="public-page public-page--auth">
      <AppHeader access={audience === 'staff' ? 'staff' : 'applicant'} />
      <main
        className={`auth-page auth-page--overlay${
          isRegisterPage ? ' auth-page--register' : ''
        }`}
      >
        <div className="auth-card">
          {isRegisterPage ? (
            <RegisterForm />
          ) : (
            <LoginForm audience={audience} />
          )}
        </div>
      </main>
    </div>
  )
}
