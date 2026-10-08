import { ApiError } from './apiError.js'
import { validDate } from './dates.js'

export const greyhoundStatuses = [
  'imported',
  'available',
  'pending_allocation',
  'allocated',
  'returned',
  'adopted',
  'unavailable',
  'inactive',
]
export const greyhoundColumns = {
  identifier: 'greyhound_identifier',
  name: 'name',
  age: 'age_years',
  sex: 'sex',
  status: 'availability_status',
  salesforceId: 'salesforce_record_id',
  registrationNumber: 'registration_number',
  dateOfBirth: 'date_of_birth',
  colour: 'colour',
  location: 'current_location',
  careInstructions: 'care_instructions',
  behaviourNotes: 'behaviour_notes',
  medicalNotes: 'medical_notes',
  compatibleWithChildren: 'compatible_with_children',
  compatibleWithCats: 'compatible_with_cats',
  compatibleWithSmallDogs: 'compatible_with_small_dogs',
  compatibleWithOtherAnimals: 'compatible_with_other_animals',
  specialRequirements: 'special_requirements',
}
export function cleanGreyhound(input, { assigned = false } = {}) {
  const result = {}
  for (const key of Object.keys(greyhoundColumns).filter(
    (key) =>
      !['age', 'sex', 'status'].includes(key) && !key.startsWith('compatible'),
  )) {
    result[key] = String(input[key] ?? '').trim() || null
    if (
      (result[key]?.length || 0) >
      ([
        'careInstructions',
        'behaviourNotes',
        'medicalNotes',
        'specialRequirements',
      ].includes(key)
        ? 4000
        : 160)
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'Greyhound text exceeds its field limit.',
      )
  }
  result.sex = String(input.sex || '').toLowerCase()
  result.age = Number(input.age)
  if ((input.age === '' || input.age == null) && !result.dateOfBirth)
    result.age = NaN
  if (
    (input.age === '' || input.age == null) &&
    result.dateOfBirth &&
    validDate(result.dateOfBirth)
  ) {
    const birth = new Date(result.dateOfBirth),
      now = new Date()
    result.age =
      now.getUTCFullYear() -
      birth.getUTCFullYear() -
      (now.getUTCMonth() < birth.getUTCMonth() ||
      (now.getUTCMonth() === birth.getUTCMonth() &&
        now.getUTCDate() < birth.getUTCDate())
        ? 1
        : 0)
  }
  result.status =
    input.status === 'medical_hold'
      ? 'unavailable'
      : input.status === 'assigned'
        ? 'allocated'
        : String(input.status || 'available')
            .toLowerCase()
            .replaceAll(' ', '_')
  if (
    !result.identifier ||
    result.identifier.length > 80 ||
    !result.name ||
    result.name.length < 2 ||
    result.name.length > 80 ||
    !Number.isInteger(result.age) ||
    result.age < 0 ||
    result.age > 20 ||
    !['male', 'female', 'unknown'].includes(result.sex) ||
    !greyhoundStatuses.includes(result.status) ||
    (result.status === 'allocated' && !assigned) ||
    (result.dateOfBirth &&
      (!validDate(result.dateOfBirth) ||
        result.dateOfBirth > new Date().toISOString().slice(0, 10)))
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Check identifier, name, age (0-20) or birth date, sex and status. Only a placement can allocate a greyhound.',
    )
  if (assigned) result.status = 'allocated'
  for (const key of Object.keys(greyhoundColumns).filter((key) =>
    key.startsWith('compatible'),
  )) {
    const value = input[key]
    if (value == null || value === '' || value === 'unknown') result[key] = null
    else if (
      value === true ||
      value === 1 ||
      ['yes', 'true', '1'].includes(String(value).toLowerCase())
    )
      result[key] = 1
    else if (
      value === false ||
      value === 0 ||
      ['no', 'false', '0'].includes(String(value).toLowerCase())
    )
      result[key] = 0
    else
      throw new ApiError(
        400,
        'VALIDATION',
        'Compatibility values must be Yes, No or Unknown.',
      )
  }
  result.feedingInformation = String(input.feedingInformation || '')
    .trim()
    .slice(0, 4000)
  result.photoUrl = String(input.photoUrl || '').trim()
  if (result.photoUrl) {
    try {
      const url = new URL(result.photoUrl)
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        result.photoUrl.length > 1000
      )
        throw new Error()
    } catch {
      throw new ApiError(
        400,
        'VALIDATION',
        'Photo URLs must use HTTPS without credentials.',
      )
    }
  }
  return result
}
