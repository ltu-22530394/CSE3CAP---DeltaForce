import type { ApplicantUser } from '../auth/authTypes'
import type { GreyhoundAssignment } from '../../../api/model'

export const APPLICATION_STEPS = [
  'Personal Details',
  'Home Environment',
  'Pet Experience',
  'Review & Submit',
] as const

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'more_information'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'inactive'

export interface ApplicationForm {
  fullName: string
  dateOfBirth: string
  email: string
  phone: string
  address: string
  suburb: string
  state: string
  postcode: string
  fenceInformation: string
  yardInformation: string
  householdDetails: string
  preferredGreyhoundCharacteristics: string
  preferredFosteringPeriod: string
  availability: string
  transportAvailability: string
  reasonForApplying: string
  emergencyContactName: string
  emergencyContactPhone: string
  termsAccepted: boolean
  privacyConsent: boolean
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
  reviewNote?: string
  editable?: boolean
  assignment?: GreyhoundAssignment
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
    suburb: '',
    state: 'NSW',
    postcode: '',
    fenceInformation: '',
    yardInformation: '',
    householdDetails: '',
    preferredGreyhoundCharacteristics: '',
    preferredFosteringPeriod: '',
    availability: '',
    transportAvailability: '',
    reasonForApplying: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    termsAccepted: false,
    privacyConsent: false,
    residenceType: '',
    housingStatus: '',
    landlordPermission: '',
    adultsInHome: '',
    childrenInHome: '',
    secureYard: '',
    applicationType: 'foster',
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
    in_review: 'In review',
    more_information: 'More information requested',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    inactive: 'Inactive',
  }
  return status ? labels[status] : 'Not Started'
}
