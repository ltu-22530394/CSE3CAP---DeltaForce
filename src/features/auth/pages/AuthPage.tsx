import { useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'

import { AppHeader } from '../../../components/AppHeader'
import { LoginForm } from '../components/LoginForm'
import { RegisterForm } from '../components/RegisterForm'

export function AuthPage(): ReactElement {
  const { pathname } = useLocation()
  const isRegisterPage = pathname === '/register'

  return (
    <div className="public-page public-page--auth">
      <AppHeader />
      <main
        className={`auth-page auth-page--overlay${
          isRegisterPage ? ' auth-page--register' : ''
        }`}
      >
        <div className="auth-card">
          {isRegisterPage ? <RegisterForm /> : <LoginForm />}
        </div>
      </main>
    </div>
  )
}
