import { staffApi } from '../../../api/staffApi'
import { staffUser } from '../../../api/seed'
import type { StaffUser } from '../../../api/model'
import {
  apiRequest,
  apiSession,
  clearApiSession,
  saveApiSession,
  useServerApi,
} from '../../../api/http'
import type { ApiUser } from '../../../api/http'
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
    if (!useServerApi) return
    let timer: number | undefined
    const reset = () => {
      window.clearTimeout(timer)
      if (apiSession())
        timer = window.setTimeout(
          () => {
            void apiRequest('/auth/logout', {}).catch(() => {})
            clearApiSession()
            setSession(null)
          },
          30 * 60 * 1000,
        )
    }
    reset()
    for (const event of ['pointerdown', 'keydown', 'gap-session-change'])
      window.addEventListener(event, reset)
    return () => {
      window.clearTimeout(timer)
      for (const event of ['pointerdown', 'keydown', 'gap-session-change'])
        window.removeEventListener(event, reset)
    }
  }, [])

  useEffect(() => {
    const sync = () => setSession(getStoredSession())
    window.addEventListener('storage', sync)
    window.addEventListener('gap-session-change', sync)
    const checkedSession = useServerApi ? apiSession() : null
    if (checkedSession) {
      void apiRequest<{ user: ApiUser }>('/auth/me')
        .then(({ user }) => {
          const current = apiSession()
          if (!current || current.token !== checkedSession.token) return
          if (current) saveApiSession({ ...current, user })
          if (current && ['applicant', 'foster_carer'].includes(user.role)) {
            const updated = { token: current.token, user }
            saveStoredSession(updated)
            setSession(updated)
          }
        })
        .catch(() => {})
    }
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('gap-session-change', sync)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.token),
      async register(details: RegistrationDetails) {
        return authService.register(details)
      },
      async login(credentials: LoginCredentials) {
        if (
          !useServerApi &&
          credentials.email.trim().toLowerCase() === staffUser.email
        ) {
          if (credentials.audience === 'applicant')
            throw new Error('Use the staff sign-in page for this account.')
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
        if (
          nextSession.user.role &&
          ['staff', 'admin'].includes(nextSession.user.role)
        ) {
          clearStoredSession()
          setSession(null)
          window.dispatchEvent(new Event('gap-session-change'))
          return {
            id: nextSession.user.id,
            name: nextSession.user.fullName,
            email: nextSession.user.email,
            role: nextSession.user.role,
          }
        }
        if (!useServerApi) staffApi.logout()
        window.dispatchEvent(new Event('gap-session-change'))
        saveStoredSession(nextSession)
        setSession(nextSession)
        return nextSession.user
      },
      logout() {
        if (useServerApi) {
          void apiRequest('/auth/logout', {}).catch(() => {})
          clearApiSession()
        }
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
