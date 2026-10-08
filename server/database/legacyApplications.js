const aliases = {
  householdType: 'residenceType',
  housingStatus: 'housingStatus',
  fenceInformation: 'fenceInformation',
  adultsInHome: 'adultsInHome',
  childrenInHome: 'childrenInHome',
  previousDogExperience: 'dogExperience',
  previousGreyhoundExperience: 'greyhoundExperience',
  yardOrOutdoorArea: 'yardInformation',
  preferredFosteringPeriod: 'preferredFosteringPeriod',
  availability: 'availability',
  preferredGreyhoundCharacteristics: 'preferredGreyhoundCharacteristics',
  reasonForApplying: 'reasonForApplying',
  emergencyContactName: 'emergencyContactName',
  emergencyContactPhone: 'emergencyContactPhone',
  termsAccepted: 'termsAccepted',
  privacyConsent: 'privacyConsent',
}

export function syncLegacyApplication(db, id, input = {}) {
  const row = db
    .prepare(
      'SELECT a.*, u.email FROM foster_applications f JOIN applicants a ON a.id = f.applicant_id JOIN users u ON u.id = a.user_id WHERE f.id = ?',
    )
    .get(id)
  const previous = db
    .prepare(
      'SELECT form_json, current_step FROM portal_application_state WHERE application_id = ?',
    )
    .get(id)
  const form = {
    fullName: [row.first_name, row.last_name].filter(Boolean).join(' '),
    email: row.email,
    phone: row.phone || '',
    address: row.address_line_1 || '',
    suburb: row.suburb || '',
    state: row.state || '',
    postcode: row.postcode || '',
    dateOfBirth: row.date_of_birth || '',
    applicationType: 'foster',
    ...(previous ? JSON.parse(previous.form_json) : {}),
    ...(input.form || {}),
  }
  for (const [source, target] of Object.entries(aliases)) {
    if (input[source] !== undefined)
      form[target] =
        typeof input[source] === 'boolean'
          ? input[source]
          : String(input[source])
  }
  if (input.landlordApproval !== undefined)
    form.landlordPermission = input.landlordApproval ? 'yes' : 'no'
  if (input.transportAvailable !== undefined)
    form.transportAvailability = input.transportAvailable ? 'yes' : 'no'
  if (input.existingPets !== undefined) {
    form.currentPetsDetails = input.existingPets
    form.hasCurrentPets = input.existingPets ? 'yes' : 'no'
  }
  const step = input.currentStep
    ? Math.min(3, Math.max(0, input.currentStep - 1))
    : previous?.current_step || 0
  db.prepare(
    'INSERT INTO portal_application_state (application_id, form_json, current_step) VALUES (?, ?, ?) ON CONFLICT(application_id) DO UPDATE SET form_json = excluded.form_json, current_step = excluded.current_step, revision = revision + 1',
  ).run(id, JSON.stringify(form), step)
}

export function backfillLegacyApplications(db) {
  const columns = {
    householdType: 'household_type',
    housingStatus: 'housing_status',
    fenceInformation: 'fence_information',
    adultsInHome: 'adults_in_home',
    childrenInHome: 'children_in_home',
    previousDogExperience: 'previous_dog_experience',
    previousGreyhoundExperience: 'previous_greyhound_experience',
    yardOrOutdoorArea: 'yard_or_outdoor_area',
    preferredFosteringPeriod: 'preferred_fostering_period',
    availability: 'availability',
    preferredGreyhoundCharacteristics: 'preferred_greyhound_characteristics',
    reasonForApplying: 'reason_for_applying',
    emergencyContactName: 'emergency_contact_name',
    emergencyContactPhone: 'emergency_contact_phone',
  }
  for (const row of db
    .prepare(
      'SELECT f.id, d.* FROM foster_applications f LEFT JOIN foster_application_details d ON d.application_id = f.id LEFT JOIN portal_application_state p ON p.application_id = f.id WHERE p.application_id IS NULL',
    )
    .all()) {
    const input = Object.fromEntries(
      Object.entries(columns)
        .filter(([, column]) => row[column] != null)
        .map(([key, column]) => [key, row[column]]),
    )
    input.termsAccepted = Boolean(row.terms_accepted)
    input.privacyConsent = Boolean(row.privacy_consent)
    syncLegacyApplication(db, row.id, input)
  }
}
