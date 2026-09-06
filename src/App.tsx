import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import type { StaffUser } from './api/model'
import { SESSION_KEY, STORAGE_KEY, staffApi } from './api/staffApi'
import { StaffShell } from './components/StaffShell'
import { FeedbackProvider } from './components/Feedback'
import { ErrorState } from './components/AsyncView'
import { DashboardPage } from './pages/DashboardPage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { ApplicationReviewPage } from './pages/ApplicationReviewPage'
import { AuthProvider, useAuth } from './applicant/features/auth/AuthContext'
import { AuthPage } from './applicant/features/auth/pages/AuthPage'
import { ApplicantDashboardPage } from './applicant/features/applicant/pages/ApplicantDashboardPage'
import { ApplicationFormPage } from './applicant/features/applicant/pages/ApplicationFormPage'
import { ProtectedRoute } from './applicant/routes/ProtectedRoute'
import './applicant/styles.css'
import { ProfilePage } from './pages/ProfilePage'
function readSession(): { user: StaffUser | null; error: Error | null } {
  try {
    return { user: staffApi.session(), error: null }
  } catch (e) {
    return {
      user: null,
      error:
        e instanceof Error ? e : new Error('Your session could not be opened.'),
    }
  }
}
function PortalRoutes() {
  const applicant = useAuth()
  const [session, setSession] = useState(readSession)
  const [revision, setRevision] = useState(0)
  const changed = useCallback(() => setRevision((n) => n + 1), [])
  useEffect(() => {
    function sync(e: StorageEvent) {
      if (e.key === SESSION_KEY || e.key === null) setSession(readSession())
      if (
        e.key === STORAGE_KEY ||
        e.key === 'gap.mock.applications' ||
        e.key === null
      )
        changed()
    }
    window.addEventListener('storage', sync)
    const refresh = () => setSession(readSession())
    window.addEventListener('gap-session-change', refresh)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('gap-session-change', refresh)
    }
  }, [changed])
  const logout = () => {
    try {
      staffApi.logout()
      setSession({ user: null, error: null })
    } catch (e) {
      setSession({
        user: session.user,
        error: e instanceof Error ? e : new Error('Unable to log out.'),
      })
    }
  }
  return (
    <>
      <FeedbackProvider>
        {session.error ? (
          <ErrorState
            error={session.error}
            retry={() => setSession(readSession())}
          />
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <Navigate
                  to={
                    session.user
                      ? '/staff'
                      : applicant.isAuthenticated
                        ? '/applicant'
                        : '/login'
                  }
                  replace
                />
              }
            />
            <Route
              path="/login"
              element={
                session.user ? (
                  <Navigate to="/staff" replace />
                ) : applicant.isAuthenticated ? (
                  <Navigate to="/applicant" replace />
                ) : (
                  <div className="applicant-surface">
                    <AuthPage />
                  </div>
                )
              }
            />
            <Route
              path="/register"
              element={
                session.user ? (
                  <Navigate to="/staff" replace />
                ) : applicant.isAuthenticated ? (
                  <Navigate to="/applicant" replace />
                ) : (
                  <div className="applicant-surface">
                    <AuthPage />
                  </div>
                )
              }
            />
            <Route element={<ProtectedRoute />}>
              <Route
                path="/applicant"
                element={
                  <div className="applicant-surface">
                    <ApplicantDashboardPage />
                  </div>
                }
              />
              <Route
                path="/applications/new"
                element={
                  <div className="applicant-surface">
                    <ApplicationFormPage />
                  </div>
                }
              />
              <Route
                path="/applications/:applicationId"
                element={
                  <div className="applicant-surface">
                    <ApplicationFormPage />
                  </div>
                }
              />
            </Route>
            <Route
              element={
                session.user ? (
                  <StaffShell user={session.user} logout={logout} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              <Route
                path="/staff"
                element={session.user && <DashboardPage revision={revision} />}
              />
              <Route
                path="/dashboard"
                element={<Navigate to="/staff" replace />}
              />
              <Route
                path="/staff/applications"
                element={<ApplicationsPage revision={revision} />}
              />
              <Route
                path="/staff/applications/:applicationId"
                element={
                  <ApplicationReviewPage
                    revision={revision}
                    changed={changed}
                  />
                }
              />
              <Route
                path="/staff/profile"
                element={session.user && <ProfilePage user={session.user} />}
              />
              <Route
                path="*"
                element={
                  <div className="empty-state">
                    <h1>Page not found</h1>
                    <p>This page may have moved or is no longer available.</p>
                    <Link className="button primary" to="/">
                      Back to dashboard
                    </Link>
                  </div>
                }
              />
            </Route>
          </Routes>
        )}
      </FeedbackProvider>
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PortalRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
