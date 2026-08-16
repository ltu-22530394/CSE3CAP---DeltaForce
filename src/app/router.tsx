import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RootLayout } from './RootLayout'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { AuthPage } from '../features/auth/pages/AuthPage'
import { ApplicantDashboardPage } from '../features/applicant/pages/ApplicantDashboardPage'
import { ApplicationFormPage } from '../features/applicant/pages/ApplicationFormPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <AuthPage /> },
      { path: 'register', element: <AuthPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'applicant', element: <ApplicantDashboardPage /> },
          { path: 'applications/new', element: <ApplicationFormPage /> },
          { path: 'applications/:applicationId', element: <ApplicationFormPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
