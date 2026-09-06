export interface ApplicantUser {
  id: string
  fullName: string
  email: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegistrationDetails extends LoginCredentials {
  fullName: string
}

export interface RegistrationValues extends RegistrationDetails {
  confirmPassword: string
}

export interface AuthSession {
  token: string
  user: ApplicantUser
}

export type ValidationErrors<T> = Partial<Record<keyof T, string>>
