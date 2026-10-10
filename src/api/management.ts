export interface PublicSettings {
  contactEmail: string
  contactPhone: string
  privacyUrl: string
  termsUrl: string
  fosteringInformation: string
  basicRequirements: string
  privacyText: string
  termsText: string
}
export interface PortalSettings extends PublicSettings {
  weeklyEnabled: boolean
  weeklyRecipients: string[]
}
export interface ManagedUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  lastLogin?: string
  verifiedAt?: string
}
export interface StaffMember {
  id: string
  name: string
  email: string
  role: string
}
export interface ApplicantProfile {
  fullName: string
  email: string
  phone: string
  address: string
  suburb: string
  state: string
  postcode: string
}
export interface Summary {
  received: number
  underReview: number
  approved: number
  rejected: number
  approvedCarers: number
  availableGreyhounds: number
  allocatedGreyhounds: number
  averageProcessingDays: number | null
}
