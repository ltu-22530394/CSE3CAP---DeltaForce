import { useEffect, useState } from 'react'
import type {
  ChangeEvent,
  FormEvent,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Alert } from '../../../components/Alert'
import { FormField } from '../../../components/FormField'
import { FieldHelp } from '../../../components/FieldHelp'
import { useAuth } from '../../auth/AuthContext'
import { ApplicantPortalShell } from '../components/ApplicantPortalShell'
import {
  APPLICATION_STEPS,
  applicationStatusLabel,
  createEmptyApplicationForm,
} from '../applicationModel'
import type { ApplicationForm, ApplicationStatus } from '../applicationModel'
import { applicationService } from '../applicationService'
import { apiRequest } from '../../../../api/http'
import {
  hasApplicationErrors,
  validateApplicationStep,
  validateCompleteApplication,
} from '../applicationValidation'
import type { ApplicationErrors } from '../applicationValidation'

const STEP_FIELDS: Array<Array<keyof ApplicationForm>> = [
  [
    'fullName',
    'dateOfBirth',
    'email',
    'phone',
    'address',
    'suburb',
    'state',
    'postcode',
  ],
  [
    'residenceType',
    'housingStatus',
    'landlordPermission',
    'adultsInHome',
    'childrenInHome',
    'secureYard',
  ],
  [
    'applicationType',
    'dogExperience',
    'greyhoundExperience',
    'hasCurrentPets',
    'currentPetsDetails',
    'preferredFosteringPeriod',
    'availability',
    'transportAvailability',
    'reasonForApplying',
    'emergencyContactName',
    'emergencyContactPhone',
  ],
  ['confirmAccurate', 'termsAccepted', 'privacyConsent'],
]

interface FieldErrorProps {
  id: string
  children?: ReactNode
}

function FieldError({ id, children }: FieldErrorProps): ReactElement | null {
  if (!children) return null
  return (
    <p className="field-error" id={id}>
      {children}
    </p>
  )
}

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  label: string
  error?: string
  options: SelectOption[]
}

function SelectField({
  id,
  label,
  error,
  options,
  ...selectProps
}: SelectFieldProps): ReactElement {
  const errorId = `${id}-error`
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...selectProps}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  label: string
  error?: string
  helpText?: string
}

function TextareaField({
  id,
  label,
  error,
  helpText,
  ...textareaProps
}: TextareaFieldProps): ReactElement {
  const errorId = `${id}-error`
  return (
    <div className="form-field form-field--wide">
      <div className="form-field__label">
        <label htmlFor={id}>{label}</label>
        {helpText && (
          <FieldHelp
            id={`${id}-help`}
            fieldName={label.replace(/\s*\*$/, '')}
            reason={helpText}
          />
        )}
      </div>
      <textarea
        id={id}
        rows={4}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [helpText ? `${id}-help` : '', error ? errorId : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...textareaProps}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}

interface RadioGroupProps {
  name: keyof ApplicationForm
  legend: string
  error?: string
  options: SelectOption[]
  value: string
  onChange(event: ChangeEvent<HTMLInputElement>): void
  disabled: boolean
}

function RadioGroup({
  name,
  legend,
  error,
  options,
  value,
  onChange,
  disabled,
}: RadioGroupProps): ReactElement {
  const errorId = `${name}-error`
  return (
    <fieldset
      className="radio-field"
      aria-describedby={error ? errorId : undefined}
    >
      <legend>{legend}</legend>
      <div className="radio-options">
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              disabled={disabled}
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  )
}

type ApplicationChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>

function toDateInputValue(value: string): string {
  const dayFirst = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  return dayFirst ? `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}` : value
}

interface ApplicationStepProps {
  form: ApplicationForm
  errors: ApplicationErrors
  onChange(event: ApplicationChangeEvent): void
  disabled: boolean
}

function PersonalDetailsStep({
  form,
  errors,
  onChange,
  disabled,
}: ApplicationStepProps): ReactElement {
  return (
    <div className="application-fields application-fields--two-column">
      <FormField
        id="application-full-name"
        label="Full Name *"
        name="fullName"
        autoComplete="name"
        value={form.fullName}
        error={errors.fullName}
        onChange={onChange}
        disabled={disabled}
      />
      <FormField
        id="application-date-of-birth"
        label="Date of Birth *"
        name="dateOfBirth"
        type="date"
        lang="en-AU"
        max={new Date().toISOString().slice(0, 10)}
        autoComplete="bday"
        value={form.dateOfBirth}
        error={errors.dateOfBirth}
        onChange={onChange}
        onClick={(event) => event.currentTarget.showPicker?.()}
        disabled={disabled}
        helpText="Used to confirm eligibility and support age-appropriate placement decisions."
      />
      <FormField
        id="application-email"
        label="Email Address *"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        value={form.email}
        error={errors.email}
        onChange={onChange}
        disabled={disabled}
      />
      <FormField
        id="application-phone"
        label="Phone Number *"
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="e.g. 0412 345 678"
        maxLength={24}
        value={form.phone}
        error={errors.phone}
        onChange={onChange}
        disabled={disabled}
      />
      <TextareaField
        id="application-address"
        label="Residential Address *"
        name="address"
        autoComplete="street-address"
        value={form.address}
        error={errors.address}
        onChange={onChange}
        disabled={disabled}
        helpText="Used to assess the home environment and plan a suitable greyhound placement."
      />
      <FormField
        id="application-suburb"
        label="Suburb *"
        name="suburb"
        value={form.suburb}
        error={errors.suburb}
        onChange={onChange}
        disabled={disabled}
      />
      <SelectField
        id="application-state"
        label="State *"
        name="state"
        value={form.state}
        onChange={onChange}
        disabled={disabled}
        options={['NSW', 'VIC', 'QLD', 'ACT', 'SA', 'WA', 'TAS', 'NT'].map(
          (value) => ({ value, label: value }),
        )}
      />
      <FormField
        id="application-postcode"
        label="Postcode *"
        name="postcode"
        inputMode="numeric"
        maxLength={4}
        value={form.postcode}
        error={errors.postcode}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}

function HomeEnvironmentStep({
  form,
  errors,
  onChange,
  disabled,
}: ApplicationStepProps): ReactElement {
  return (
    <div className="application-fields application-fields--two-column">
      <SelectField
        id="residence-type"
        label="Residence Type *"
        name="residenceType"
        value={form.residenceType}
        error={errors.residenceType}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: 'house', label: 'House' },
          { value: 'apartment', label: 'Apartment' },
          { value: 'townhouse', label: 'Townhouse' },
          { value: 'other', label: 'Other' },
        ]}
      />
      <RadioGroup
        name="housingStatus"
        legend="Do you own or rent? *"
        value={form.housingStatus}
        error={errors.housingStatus}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: 'owner', label: 'Own' },
          { value: 'renting', label: 'Rent' },
        ]}
      />
      {form.housingStatus === 'renting' && (
        <RadioGroup
          name="landlordPermission"
          legend="Do you have landlord permission for a dog? *"
          value={form.landlordPermission}
          error={errors.landlordPermission}
          onChange={onChange}
          disabled={disabled}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
      )}
      <FormField
        id="adults-in-home"
        label="Adults in Household *"
        name="adultsInHome"
        type="number"
        min="1"
        value={form.adultsInHome}
        error={errors.adultsInHome}
        onChange={onChange}
        disabled={disabled}
      />
      <FormField
        id="children-in-home"
        label="Children in Household *"
        name="childrenInHome"
        type="number"
        min="0"
        value={form.childrenInHome}
        error={errors.childrenInHome}
        onChange={onChange}
        disabled={disabled}
      />
      <RadioGroup
        name="secureYard"
        legend="Do you have a secure fenced yard? *"
        value={form.secureYard}
        error={errors.secureYard}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'not-applicable', label: 'Not applicable' },
        ]}
      />
      <TextareaField id="yard-information" name="yardInformation" label="Yard or outdoor area details" value={form.yardInformation} onChange={onChange} disabled={disabled} />
      <TextareaField id="fence-information" name="fenceInformation" label="Fence height, type and condition" value={form.fenceInformation} onChange={onChange} disabled={disabled} />
      <TextareaField id="household-details" name="householdDetails" label="Household member details" value={form.householdDetails} onChange={onChange} disabled={disabled} />
    </div>
  )
}

function PetExperienceStep({
  form,
  errors,
  onChange,
  disabled,
}: ApplicationStepProps): ReactElement {
  return (
    <div className="application-fields">
      <RadioGroup
        name="applicationType"
        legend="I would like to apply to *"
        value={form.applicationType}
        error={errors.applicationType}
        onChange={onChange}
        disabled={disabled}
        options={[{ value: 'foster', label: 'Foster a greyhound' }]}
      />
      <TextareaField
        id="dog-experience"
        label="Describe your experience caring for dogs *"
        name="dogExperience"
        value={form.dogExperience}
        error={errors.dogExperience}
        onChange={onChange}
        disabled={disabled}
      />
      <RadioGroup
        name="greyhoundExperience"
        legend="Have you cared for a greyhound before? *"
        value={form.greyhoundExperience}
        error={errors.greyhoundExperience}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
      />
      <RadioGroup
        name="hasCurrentPets"
        legend="Do pets currently live in your home? *"
        value={form.hasCurrentPets}
        error={errors.hasCurrentPets}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
      />
      {form.hasCurrentPets === 'yes' && (
        <TextareaField
          id="current-pets-details"
          label="Tell us about your current pets *"
          name="currentPetsDetails"
          value={form.currentPetsDetails}
          error={errors.currentPetsDetails}
          onChange={onChange}
          disabled={disabled}
        />
      )}
      <FormField
        id="fostering-period"
        label="Preferred fostering period *"
        name="preferredFosteringPeriod"
        value={form.preferredFosteringPeriod}
        error={errors.preferredFosteringPeriod}
        onChange={onChange}
        disabled={disabled}
      />
      <TextareaField
        id="availability"
        label="Your availability *"
        name="availability"
        value={form.availability}
        error={errors.availability}
        onChange={onChange}
        disabled={disabled}
      />
      <RadioGroup
        name="transportAvailability"
        legend="Can you transport a greyhound? *"
        value={form.transportAvailability}
        error={errors.transportAvailability}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
      />
      <TextareaField
        id="reason-for-applying"
        label="Why would you like to foster? *"
        name="reasonForApplying"
        value={form.reasonForApplying}
        error={errors.reasonForApplying}
        onChange={onChange}
        disabled={disabled}
      />
      <FormField
        id="emergency-contact-name"
        label="Emergency contact name *"
        name="emergencyContactName"
        value={form.emergencyContactName}
        error={errors.emergencyContactName}
        onChange={onChange}
        disabled={disabled}
      />
      <TextareaField id="preferred-greyhound" name="preferredGreyhoundCharacteristics" label="Preferred greyhound characteristics" value={form.preferredGreyhoundCharacteristics} onChange={onChange} disabled={disabled} />
      <FormField
        id="emergency-contact-phone"
        label="Emergency contact phone *"
        name="emergencyContactPhone"
        type="tel"
        value={form.emergencyContactPhone}
        error={errors.emergencyContactPhone}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}

interface ReviewItem {
  label: string
  value: string
  wide?: boolean
}

interface ReviewSection {
  title: string
  items: ReviewItem[]
}

function reviewChoice(
  value: string,
  labels: Record<string, string>,
  fallback = 'Not provided',
): string {
  return labels[value] ?? fallback
}

function reviewDate(value: string): string {
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const dayFirstDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  const year = isoDate?.[1] ?? dayFirstDate?.[3]
  const month = Number(isoDate?.[2] ?? dayFirstDate?.[2])
  const day = Number(isoDate?.[3] ?? dayFirstDate?.[1])
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  return year && monthNames[month - 1] && day
    ? `${day} ${monthNames[month - 1]} ${year}`
    : value
}

function ReviewStep({
  form,
  errors,
  onChange,
  disabled,
}: ApplicationStepProps): ReactElement {
  const yesNoLabels = { yes: 'Yes', no: 'No' }
  const reviewSections: ReviewSection[] = [
    {
      title: 'Personal details',
      items: [
        { label: 'Full name', value: form.fullName },
        { label: 'Date of birth', value: reviewDate(form.dateOfBirth) },
        { label: 'Email address', value: form.email },
        { label: 'Phone number', value: form.phone },
        { label: 'Residential address', value: form.address, wide: true },
        {
          label: 'Suburb / state / postcode',
          value: `${form.suburb} ${form.state} ${form.postcode}`,
        },
      ],
    },
    {
      title: 'Home environment',
      items: [
        {
          label: 'Residence type',
          value: reviewChoice(form.residenceType, {
            house: 'House',
            apartment: 'Apartment',
            townhouse: 'Townhouse',
            other: 'Other',
          }),
        },
        {
          label: 'Home status',
          value: reviewChoice(form.housingStatus, {
            owner: 'Own',
            renting: 'Rent',
          }),
        },
        {
          label: 'Landlord permission',
          value:
            form.housingStatus === 'renting'
              ? reviewChoice(form.landlordPermission, yesNoLabels)
              : 'Not applicable',
        },
        { label: 'Adults in household', value: form.adultsInHome },
        { label: 'Children in household', value: form.childrenInHome },
        { label: 'Yard or outdoor area', value: form.yardInformation, wide: true },
        { label: 'Fence information', value: form.fenceInformation, wide: true },
        { label: 'Household member details', value: form.householdDetails, wide: true },
        {
          label: 'Secure fenced yard',
          value: reviewChoice(form.secureYard, {
            ...yesNoLabels,
            'not-applicable': 'Not applicable',
          }),
        },
      ],
    },
    {
      title: 'Pet experience',
      items: [
        {
          label: 'Preferred fostering period',
          value: form.preferredFosteringPeriod,
        },
        { label: 'Availability', value: form.availability },
        { label: 'Transport', value: form.transportAvailability },
        {
          label: 'Reason for applying',
          value: form.reasonForApplying,
          wide: true,
        },
        {
          label: 'Emergency contact',
          value: `${form.emergencyContactName} ${form.emergencyContactPhone}`,
        },
        {
          label: 'Application type',
          value: reviewChoice(form.applicationType, {
            foster: 'Foster a greyhound',
            adoption: 'Adopt a greyhound',
          }),
        },
        {
          label: 'Greyhound experience',
          value: reviewChoice(form.greyhoundExperience, yesNoLabels),
        },
        {
          label: 'Dog care experience',
          value: form.dogExperience,
          wide: true,
        },
        {
          label: 'Pets currently in the home',
          value: reviewChoice(form.hasCurrentPets, yesNoLabels),
        },
        { label: 'Preferred greyhound characteristics', value: form.preferredGreyhoundCharacteristics, wide: true },
        {
          label: 'Current pet details',
          value:
            form.hasCurrentPets === 'yes'
              ? form.currentPetsDetails
              : 'Not applicable',
          wide: true,
        },
      ],
    },
  ]

  return (
    <div className="review-step">
      <p>
        Review your answers before submitting. Use Back to make any changes.
      </p>
      <div className="review-sections">
        {reviewSections.map((section) => (
          <section className="review-section" key={section.title}>
            <h3>{section.title}</h3>
            <dl className="review-list">
              {section.items.map((item) => (
                <div
                  className={item.wide ? 'review-item--wide' : undefined}
                  key={item.label}
                >
                  <dt>{item.label}</dt>
                  <dd>{item.value || 'Not provided'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <label className="confirmation-field">
        <input
          type="checkbox"
          name="confirmAccurate"
          checked={form.confirmAccurate}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={Boolean(errors.confirmAccurate)}
          aria-describedby={
            errors.confirmAccurate ? 'confirm-accurate-error' : undefined
          }
        />
        <span>I confirm these details are correct. *</span>
      </label>
      <FieldError id="confirm-accurate-error">
        {errors.confirmAccurate}
      </FieldError>
      <label className="confirmation-field">
        <input
          type="checkbox"
          name="termsAccepted"
          checked={form.termsAccepted}
          onChange={onChange}
          disabled={disabled}
        />
        <span>
          I accept the{' '}
          <Link to="/privacy" target="_blank">
            terms of use
          </Link>
          . *
        </span>
      </label>
      <FieldError id="terms-error">{errors.termsAccepted}</FieldError>
      <label className="confirmation-field">
        <input
          type="checkbox"
          name="privacyConsent"
          checked={form.privacyConsent}
          onChange={onChange}
          disabled={disabled}
        />
        <span>
          I consent to GAP using this information to assess and manage my foster
          application.{' '}
          <Link to="/privacy" target="_blank">
            Privacy notice
          </Link>
          . *
        </span>
      </label>
      <FieldError id="privacy-error">{errors.privacyConsent}</FieldError>
    </div>
  )
}

export function ApplicationFormPage(): ReactElement | null {
  const { user } = useAuth()
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()
  const [recordId, setRecordId] = useState<string | null>(null)
  const [form, setForm] = useState<ApplicationForm>(() =>
    createEmptyApplicationForm(user || undefined),
  )
  const [currentStep, setCurrentStep] = useState(0)
  const [status, setStatus] = useState<ApplicationStatus>('draft')
  const [reviewNote, setReviewNote] = useState('')
  const [editable, setEditable] = useState(false)
  const [errors, setErrors] = useState<ApplicationErrors>({})
  const [requestError, setRequestError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(Boolean(applicationId))
  const [isSaving, setIsSaving] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<{
    password?: string
    confirmPassword?: string
  }>({})
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!applicationId || !user) return undefined
    let isActive = true

    applicationService
      .get(applicationId, user.id)
      .then((application) => {
        if (!isActive) return
        setRecordId(application.id)
        setForm({
          ...createEmptyApplicationForm(),
          ...application.form,
          dateOfBirth: toDateInputValue(application.form.dateOfBirth),
        })
        setCurrentStep(application.currentStep ?? 0)
        setStatus(application.status)
        setEditable(Boolean(application.editable))
        if (application.editable) setCurrentStep(0)
        setReviewNote(application.reviewNote || '')
      })
      .catch((error) => {
        if (isActive) {
          setRequestError(error.message || 'Application could not be loaded.')
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [applicationId, user])

  const publicMode = !user
  const applicant = user || { id: '', fullName: '', email: '' }

  const readOnly = status !== 'draft' && !editable

  function handleChange(event: ApplicationChangeEvent): void {
    const target = event.target
    const field = target.name as keyof ApplicationForm
    const nextValue =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : target.value
    setForm(
      (current) =>
        ({
          ...current,
          [field]: nextValue,
        }) as ApplicationForm,
    )
    setErrors((current) => ({ ...current, [field]: undefined }))
    if (field === 'confirmAccurate' && nextValue === true) {
      setRequestError('')
    }
    setMessage('')
  }

  function goToStep(step: number): void {
    setCurrentStep(step)
  }

  function handleNext(): void {
    if (readOnly) {
      goToStep(Math.min(currentStep + 1, APPLICATION_STEPS.length - 1))
      return
    }
    const nextErrors = validateApplicationStep(currentStep, form)
    setErrors(nextErrors)
    const nextPasswordErrors: {
      password?: string
      confirmPassword?: string
    } = {}
    if (publicMode && currentStep === 0) {
      if (!password) nextPasswordErrors.password = 'Password is required.'
      else if (
        password.length < 8 ||
        new TextEncoder().encode(password).length > 72
      )
        nextPasswordErrors.password =
          'Use at least 8 characters and at most 72 UTF-8 bytes.'
      if (!confirmPassword)
        nextPasswordErrors.confirmPassword = 'Confirm your password.'
      else if (password !== confirmPassword)
        nextPasswordErrors.confirmPassword = 'Passwords do not match.'
    }
    setPasswordErrors(nextPasswordErrors)
    if (
      hasApplicationErrors(nextErrors) ||
      Object.keys(nextPasswordErrors).length
    ) {
      setRequestError('Check the highlighted fields.')
      window.requestAnimationFrame(() => {
        const firstInvalid = document.querySelector<HTMLElement>(
          '[aria-invalid="true"]',
        )
        firstInvalid?.focus()
      })
      return
    }
    setRequestError('')
    goToStep(currentStep + 1)
  }

  async function handleSaveDraft(): Promise<void> {
    setRequestError('')
    setMessage('')
    try {
      setIsSaving(true)
      const saved = await applicationService.saveDraft({
        id: recordId,
        applicantId: applicant.id,
        currentStep,
        form,
      })
      setRecordId(saved.id)
      setStatus(saved.status)
      setMessage('Draft saved successfully.')
      if (!applicationId) {
        navigate(`/applications/${saved.id}`, { replace: true })
      }
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Draft could not be saved.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    if (readOnly) return

    const nextErrors = validateCompleteApplication(form)
    setErrors(nextErrors)
    setRequestError('')
    setMessage('')

    if (hasApplicationErrors(nextErrors)) {
      const firstInvalidStep = STEP_FIELDS.findIndex((fields) =>
        fields.some((field) => nextErrors[field]),
      )
      goToStep(Math.max(firstInvalidStep, 0))
      setRequestError('Check the highlighted fields.')
      return
    }

    try {
      setIsSaving(true)
      if (publicMode) {
        const result = await apiRequest<{
          applicationId: string
          message: string
        }>('/portal/apply', { form, password })
        navigate('/applicant/login', {
          replace: true,
          state: {
            registrationMessage: `${result.message} Application ID: ${result.applicationId}`,
          },
        })
        return
      }
      await applicationService.submit({
        id: recordId,
        applicantId: applicant.id,
        currentStep: 3,
        form,
      })
      navigate('/applicant', {
        replace: true,
        state: { applicationMessage: 'Application submitted successfully.' },
      })
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Application could not be submitted.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function renderStep(): ReactElement {
    const props = { form, errors, onChange: handleChange, disabled: readOnly }
    if (currentStep === 0) return <PersonalDetailsStep {...props} />
    if (currentStep === 1) return <HomeEnvironmentStep {...props} />
    if (currentStep === 2) return <PetExperienceStep {...props} />
    return <ReviewStep {...props} />
  }

  return (
    <ApplicantPortalShell>
      <main className="application-page">
        <div className="application-heading">
          <div>
            <p className="eyebrow">Application Form</p>
            <h1>{readOnly ? 'Submitted Application' : 'Foster Application'}</h1>
            {readOnly && (
              <p className="status-badge">{applicationStatusLabel(status)}</p>
            )}
            <p>
              {readOnly
                ? reviewNote ||
                  'This application has been submitted and is now read-only.'
                : 'Apply to become a GAP foster carer.'}
            </p>
          </div>
          <Link
            className="application-back-link"
            to={publicMode ? '/applicant/login' : '/applicant'}
          >
            <span aria-hidden="true">←</span>
            {publicMode ? 'Sign in' : 'Back to Dashboard'}
          </Link>
        </div>

        <ol className="application-stepper" aria-label="Application progress">
          {APPLICATION_STEPS.map((step, index) => (
            <li
              className={
                index === currentStep
                  ? 'is-current'
                  : index < currentStep
                    ? 'is-complete'
                    : ''
              }
              key={step}
            >
              <button
                type="button"
                onClick={() => readOnly && goToStep(index)}
                disabled={!readOnly}
              >
                <span>{index + 1}</span>
                {step}
              </button>
            </li>
          ))}
        </ol>

        {isLoading ? (
          <section className="application-panel">
            <p>Loading application…</p>
          </section>
        ) : requestError && !recordId && applicationId ? (
          <section className="application-panel">
            <Alert>{requestError}</Alert>
            <Link to="/applicant">Return to Dashboard</Link>
          </section>
        ) : (
          <form
            className="application-layout"
            onSubmit={handleSubmit}
            noValidate
          >
            <section className="application-panel">
              <div className="application-panel__heading">
                <p>
                  Step {currentStep + 1} of {APPLICATION_STEPS.length}
                </p>
                <h2>{APPLICATION_STEPS[currentStep]}</h2>
              </div>

              <Alert>{requestError}</Alert>
              <Alert tone="success">{message}</Alert>
              {renderStep()}
              {publicMode && currentStep === 0 && (
                <div className="application-fields">
                  <FormField
                    id="apply-password"
                    label="Password *"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    error={passwordErrors.password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setPasswordErrors((current) => ({
                        ...current,
                        password: undefined,
                      }))
                    }}
                  />
                  <FormField
                    id="apply-confirm-password"
                    label="Confirm password *"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    error={passwordErrors.confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value)
                      setPasswordErrors((current) => ({
                        ...current,
                        confirmPassword: undefined,
                      }))
                    }}
                  />
                </div>
              )}

              <div className="application-actions">
                {currentStep > 0 && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => goToStep(currentStep - 1)}
                  >
                    Back
                  </button>
                )}
                <span className="application-actions__spacer" />
                {!readOnly && !publicMode && !editable && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving…' : 'Save Draft'}
                  </button>
                )}
                {currentStep < APPLICATION_STEPS.length - 1 ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={handleNext}
                  >
                    Next
                  </button>
                ) : readOnly ? (
                  <Link className="primary-button" to="/applicant">
                    Return to Dashboard
                  </Link>
                ) : (
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Submitting…' : 'Submit Application'}
                  </button>
                )}
              </div>
            </section>

            <aside className="application-help">
              <h2>Application notes</h2>
              <ul>
                <li>Required fields are marked with *.</li>
                {!publicMode && (
                  <li>You can save a draft and return at any time.</li>
                )}
                <li>GAP uses these details to review your application.</li>
              </ul>
            </aside>
          </form>
        )}
      </main>
    </ApplicantPortalShell>
  )
}
