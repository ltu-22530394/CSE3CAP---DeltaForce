import { useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'

import { AppHeader } from '../../../components/AppHeader'
import { LoginForm } from '../components/LoginForm'
import { RegisterForm } from '../components/RegisterForm'

export function AuthPage(): ReactElement {
  const { pathname } = useLocation()
  const activePanel = pathname === '/register' ? 'register' : 'login'

  return (
    <div className="public-page">
      <AppHeader />
      <main className="auth-page">
        <h1>Applicant Login / Register</h1>
        <div className={`auth-grid auth-grid--${activePanel}`}>
          <LoginForm />
          <RegisterForm />
        </div>
      </main>
    </div>
  )
}
