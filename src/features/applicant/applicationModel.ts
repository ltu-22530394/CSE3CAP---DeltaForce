import type { ApplicantUser } from '../auth/authTypes'

export const APPLICATION_STEPS = [
  'Personal Details',
  'Home Environment',
  'Pet Experience',
  'Review & Submit',
] as const

export type ApplicationStatus = 'draft' | 'submitted'

export interface ApplicationForm {
  fullName: string
  dateOfBirth: string
  email: string
  phone: string
  address: string
  residenceType: string
  housingStatus: string
  landlordPermission: string
  adultsInHome: string
  childrenInHome: string
  secureYard: string
  applicationType: string
  dogExperience: string
  greyhoundExperience: string
  hasCurrentPets: string
  currentPetsDetails: string
  confirmAccurate: boolean
}

export interface StoredApplication {
  id: string
  applicantId: string
  status: ApplicationStatus
  currentStep: number
  form: ApplicationForm
  createdAt: string
  updatedAt: string
  submittedAt: string | null
}

export interface ApplicationWriteInput {
  id?: string | null
  applicantId: string
  currentStep: number
  form: ApplicationForm
}

export function createEmptyApplicationForm(
  user?: Pick<ApplicantUser, 'fullName' | 'email'>,
): ApplicationForm {
  return {
    fullName: user?.fullName ?? '',
    dateOfBirth: '',
    email: user?.email ?? '',
    phone: '',
    address: '',
    residenceType: '',
    housingStatus: '',
    landlordPermission: '',
    adultsInHome: '',
    childrenInHome: '',
    secureYard: '',
    applicationType: '',
    dogExperience: '',
    greyhoundExperience: '',
    hasCurrentPets: '',
    currentPetsDetails: '',
    confirmAccurate: false,
  }
}

export function applicationStatusLabel(status?: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
  }
  return status ? labels[status] : 'Not Started'
}
