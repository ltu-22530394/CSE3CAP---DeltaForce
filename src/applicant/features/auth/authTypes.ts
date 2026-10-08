export interface ApplicantUser {
  id: string
  fullName: string
  email: string
  role?: 'applicant' | 'foster_carer' | 'staff' | 'admin'
  applicantId?: string | null
  verificationUrl?: string
}

export type PortalAudience = 'applicant' | 'staff'

export interface LoginCredentials {
  email: string
  password: string
  audience?: PortalAudience
}

export interface RegistrationDetails extends LoginCredentials {
  fullName: string
  termsAccepted?: boolean
  privacyConsent?: boolean
}

export interface RegistrationValues extends RegistrationDetails {
  confirmPassword: string
}

export interface AuthSession {
  token: string
  user: ApplicantUser
}

export type ValidationErrors<T> = Partial<Record<keyof T, string>>
