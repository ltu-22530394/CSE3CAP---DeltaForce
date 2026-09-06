import { staffApi } from '../../../api/staffApi'
import { staffUser } from '../../../api/seed'
import type { StaffUser } from '../../../api/model'
import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import type { PropsWithChildren, ReactElement } from 'react'

import { authService } from './authService'
import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession,
} from './authSession'
import type {
  ApplicantUser,
  AuthSession,
  LoginCredentials,
  RegistrationDetails,
} from './authTypes'

interface AuthContextValue {
  user: ApplicantUser | null
  isAuthenticated: boolean
  register(details: RegistrationDetails): Promise<ApplicantUser>
  login(credentials: LoginCredentials): Promise<ApplicantUser | StaffUser>
  logout(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren): ReactElement {
  const [session, setSession] = useState<AuthSession | null>(getStoredSession)

  useEffect(() => {
    const sync = () => setSession(getStoredSession())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.token),
      async register(details: RegistrationDetails) {
        return authService.register(details)
      },
      async login(credentials: LoginCredentials) {
        if (credentials.email.trim().toLowerCase() === staffUser.email) {
          const staff = await staffApi.login(
            credentials.email,
            credentials.password,
          )
          clearStoredSession()
          setSession(null)
          window.dispatchEvent(new Event('gap-session-change'))
          return staff
        }
        const nextSession = await authService.login(credentials)
        staffApi.logout()
        window.dispatchEvent(new Event('gap-session-change'))
        saveStoredSession(nextSession)
        setSession(nextSession)
        return nextSession.user
      },
      logout() {
        clearStoredSession()
        setSession(null)
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
