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
import { useAuth } from '../../auth/AuthContext'
import { ApplicantPortalShell } from '../components/ApplicantPortalShell'
import {
  APPLICATION_STEPS,
  createEmptyApplicationForm,
} from '../applicationModel'
import type { ApplicationForm } from '../applicationModel'
import { applicationService } from '../applicationService'
import {
  hasApplicationErrors,
  validateApplicationStep,
  validateCompleteApplication,
} from '../applicationValidation'
import type { ApplicationErrors } from '../applicationValidation'

const STEP_FIELDS: Array<Array<keyof ApplicationForm>> = [
  ['fullName', 'dateOfBirth', 'email', 'phone', 'address'],
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
  ],
  ['confirmAccurate'],
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
}

function TextareaField({
  id,
  label,
  error,
  ...textareaProps
}: TextareaFieldProps): ReactElement {
  const errorId = `${id}-error`
  return (
    <div className="form-field form-field--wide">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={4}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
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
    <fieldset className="radio-field" aria-describedby={error ? errorId : undefined}>
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
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        autoComplete="bday"
        value={form.dateOfBirth}
        error={errors.dateOfBirth}
        onChange={onChange}
        disabled={disabled}
      />
      <FormField
        id="application-email"
        label="Email Address *"
        name="email"
        type="email"
        autoComplete="email"
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
        options={[
          { value: 'foster', label: 'Foster a greyhound' },
          { value: 'adoption', label: 'Adopt a greyhound' },
        ]}
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
    </div>
  )
}

function ReviewStep({
  form,
  errors,
  onChange,
  disabled,
}: ApplicationStepProps): ReactElement {
  const reviewItems: Array<[string, string]> = [
    ['Applicant', form.fullName],
    ['Contact', `${form.email} · ${form.phone}`],
    ['Address', form.address],
    ['Residence', `${form.residenceType} · ${form.housingStatus}`],
    ['Household', `${form.adultsInHome} adult(s), ${form.childrenInHome} child(ren)`],
    ['Application', form.applicationType === 'adoption' ? 'Adoption' : 'Foster'],
    ['Current pets', form.hasCurrentPets === 'yes' ? form.currentPetsDetails : 'None'],
  ]

  return (
    <div className="review-step">
      <p>Review your answers before submitting. Use Back to make any changes.</p>
      <dl className="review-list">
        {reviewItems.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
      <label className="confirmation-field">
        <input
          type="checkbox"
          name="confirmAccurate"
          checked={form.confirmAccurate}
          onChange={onChange}
          disabled={disabled}
        />
        I confirm that the information provided is complete and accurate. *
      </label>
      <FieldError id="confirm-accurate-error">{errors.confirmAccurate}</FieldError>
    </div>
  )
}

export function ApplicationFormPage(): ReactElement | null {
  const { user } = useAuth()
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()
  const [recordId, setRecordId] = useState<string | null>(null)
  const [form, setForm] = useState<ApplicationForm>(() =>
    createEmptyApplicationForm(user ?? undefined),
  )
  const [currentStep, setCurrentStep] = useState(0)
  const [status, setStatus] = useState('draft')
  const [errors, setErrors] = useState<ApplicationErrors>({})
  const [requestError, setRequestError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(Boolean(applicationId))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!applicationId || !user) return undefined
    let isActive = true

    applicationService
      .get(applicationId, user.id)
      .then((application) => {
        if (!isActive) return
        setRecordId(application.id)
        setForm({ ...createEmptyApplicationForm(user), ...application.form })
        setCurrentStep(application.currentStep ?? 0)
        setStatus(application.status)
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

  if (!user) return null
  const applicant = user

  const readOnly = status === 'submitted'

  function handleChange(event: ApplicationChangeEvent): void {
    const target = event.target
    const field = target.name as keyof ApplicationForm
    const nextValue =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : target.value
    setForm((current) => ({
      ...current,
      [field]: nextValue,
    }) as ApplicationForm)
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage('')
  }

  function goToStep(step: number): void {
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNext(): void {
    if (readOnly) {
      goToStep(Math.min(currentStep + 1, APPLICATION_STEPS.length - 1))
      return
    }
    const nextErrors = validateApplicationStep(currentStep, form)
    setErrors(nextErrors)
    if (!hasApplicationErrors(nextErrors)) goToStep(currentStep + 1)
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
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
      setRequestError('Please complete all required fields before submitting.')
      return
    }

    try {
      setIsSaving(true)
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
    <ApplicantPortalShell activeItem="applications">
      <main className="application-page">
        <div className="application-heading">
          <div>
            <p className="eyebrow">Application Form</p>
            <h1>{readOnly ? 'Submitted Application' : 'Foster & Adoption Application'}</h1>
            <p>
              {readOnly
                ? 'This application has been submitted and is now read-only.'
                : 'Complete all four steps. You can save a draft and return later.'}
            </p>
          </div>
          <Link to="/applicant">Back to Dashboard</Link>
        </div>

        <ol className="application-stepper" aria-label="Application progress">
          {APPLICATION_STEPS.map((step, index) => (
            <li
              className={index === currentStep ? 'is-current' : index < currentStep ? 'is-complete' : ''}
              key={step}
            >
              <button type="button" onClick={() => readOnly && goToStep(index)} disabled={!readOnly}>
                <span>{index + 1}</span>
                {step}
              </button>
            </li>
          ))}
        </ol>

        {isLoading ? (
          <section className="application-panel"><p>Loading application…</p></section>
        ) : requestError && !recordId && applicationId ? (
          <section className="application-panel">
            <Alert>{requestError}</Alert>
            <Link to="/applicant">Return to Dashboard</Link>
          </section>
        ) : (
          <form className="application-layout" onSubmit={handleSubmit} noValidate>
            <section className="application-panel">
              <div className="application-panel__heading">
                <p>Step {currentStep + 1} of {APPLICATION_STEPS.length}</p>
                <h2>{APPLICATION_STEPS[currentStep]}</h2>
              </div>

              <Alert>{requestError}</Alert>
              <Alert tone="success">{message}</Alert>
              {renderStep()}

              <div className="application-actions">
                {currentStep > 0 && (
                  <button className="secondary-button" type="button" onClick={() => goToStep(currentStep - 1)}>
                    Back
                  </button>
                )}
                <span className="application-actions__spacer" />
                {!readOnly && (
                  <button className="secondary-button" type="button" onClick={handleSaveDraft} disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Save Draft'}
                  </button>
                )}
                {currentStep < APPLICATION_STEPS.length - 1 ? (
                  <button className="primary-button" type="button" onClick={handleNext}>
                    Next
                  </button>
                ) : readOnly ? (
                  <Link className="primary-button" to="/applicant">Return to Dashboard</Link>
                ) : (
                  <button className="primary-button" type="submit" disabled={isSaving}>
                    {isSaving ? 'Submitting…' : 'Submit Application'}
                  </button>
                )}
              </div>
            </section>

            <aside className="application-help">
              <h2>Why do we ask for this?</h2>
              <p>
                These details help the GAP team understand your household and identify a suitable greyhound placement.
              </p>
              <p>
                Fields marked with * are required before submission. Drafts can be saved without completing every field.
              </p>
              <p>
                Your information is used only to assess and manage your foster or adoption application.
              </p>
            </aside>
          </form>
        )}
      </main>
    </ApplicantPortalShell>
  )
}
