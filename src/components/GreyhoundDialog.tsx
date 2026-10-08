import { useEffect, useRef, useState } from 'react'
import type {
  Greyhound,
  GreyhoundStatus,
  GreyhoundDetails,
  GreyhoundSex,
} from '../api/model'
import { staffApi } from '../api/staffApi'
import { Icon } from './Icon'
import { greyhoundStatusLabels } from '../api/model'

export function GreyhoundDialog({
  greyhound,
  close,
  complete,
}: {
  greyhound?: Greyhound
  close: () => void
  complete: (greyhound: Greyhound) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const nameField = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(greyhound?.name ?? '')
  const [age, setAge] = useState(greyhound ? String(greyhound.age) : '')
  const [sex, setSex] = useState<GreyhoundSex>(greyhound?.sex ?? 'Female')
  const [status, setStatus] = useState<GreyhoundStatus>(
    greyhound?.status || 'available',
  )
  const [details, setDetails] = useState<GreyhoundDetails>(greyhound || {})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement
    element?.showModal()
    nameField.current?.focus()
    return () => {
      element?.close()
      previous?.focus()
    }
  }, [])

  async function submit() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const saved = await staffApi.saveGreyhound({
        ...details,
        id: greyhound?.id,
        name,
        age: age.trim() ? Number(age) : Number.NaN,
        sex,
        status,
      })
      complete(saved)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'The greyhound could not be saved. Please try again.',
      )
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="decision-dialog greyhound-dialog"
      aria-labelledby="greyhound-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          const rect = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close()
        }
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close dialog"
        disabled={saving}
        onClick={close}
      >
        <Icon name="close" />
      </button>
      <p className="eyebrow">{greyhound?.id ?? 'New record'}</p>
      <h2 id="greyhound-dialog-title">
        {greyhound ? 'Edit Greyhound' : 'Add Greyhound'}
      </h2>
      <form
        className="greyhound-form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        noValidate
      >
        <label className="field">
          <span>Name</span>
          <input
            ref={nameField}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
            autoComplete="off"
            maxLength={80}
            required
          />
        </label>
        <div className="greyhound-form-row">
          <label className="field">
            <span>Age</span>
            <input
              type="number"
              min="0"
              max="20"
              inputMode="numeric"
              value={age}
              onChange={(event) => {
                setAge(event.target.value)
                setError('')
              }}
              required
            />
          </label>
          <label className="field">
            <span>Sex</span>
            <select
              value={sex}
              onChange={(event) => setSex(event.target.value as GreyhoundSex)}
            >
              <option>Female</option>
              <option>Male</option>
              <option>Unknown</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Status</span>
          <select
            value={status}
            disabled={greyhound?.status === 'assigned'}
            onChange={(event) =>
              setStatus(event.target.value as GreyhoundStatus)
            }
          >
            {Object.entries(greyhoundStatusLabels)
              .filter(
                ([key]) =>
                  key !== 'assigned' || greyhound?.status === 'assigned',
              )
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <div className="management-grid">
          {(
            [
              'identifier',
              'salesforceId',
              'registrationNumber',
              'dateOfBirth',
              'colour',
              'location',
              'photoUrl',
            ] as const
          ).map((key) => (
            <label className="field" key={key}>
              <span>
                {
                  {
                    identifier: 'Greyhound identifier',
                    salesforceId: 'Salesforce ID',
                    registrationNumber: 'Registration number',
                    dateOfBirth: 'Date of birth',
                    colour: 'Colour',
                    location: 'Current location',
                    photoUrl: 'Photo HTTPS URL',
                  }[key]
                }
              </span>
              <input
                value={details[key] || ''}
                type={
                  key === 'dateOfBirth'
                    ? 'date'
                    : key === 'photoUrl'
                      ? 'url'
                      : 'text'
                }
                maxLength={key === 'photoUrl' ? 1000 : 160}
                onChange={(event) =>
                  setDetails({ ...details, [key]: event.target.value })
                }
              />
            </label>
          ))}
        </div>
        {(
          [
            'careInstructions',
            'feedingInformation',
            'behaviourNotes',
            'medicalNotes',
            'specialRequirements',
          ] as const
        ).map((key) => (
          <label className="field" key={key}>
            <span>
              {
                {
                  careInstructions: 'Foster-visible care instructions',
                  feedingInformation: 'Feeding information',
                  behaviourNotes: 'Foster-visible behaviour notes',
                  medicalNotes: 'Foster-visible medical / safety notes',
                  specialRequirements: 'Special requirements',
                }[key]
              }
            </span>
            <textarea
              rows={2}
              maxLength={4000}
              value={details[key] || ''}
              onChange={(event) =>
                setDetails({ ...details, [key]: event.target.value })
              }
            />
          </label>
        ))}
        <div className="management-grid">
          {(
            [
              'compatibleWithChildren',
              'compatibleWithCats',
              'compatibleWithSmallDogs',
              'compatibleWithOtherAnimals',
            ] as const
          ).map((key) => (
            <label className="field" key={key}>
              <span>
                {
                  {
                    compatibleWithChildren: 'Compatible with children',
                    compatibleWithCats: 'Compatible with cats',
                    compatibleWithSmallDogs: 'Compatible with small dogs',
                    compatibleWithOtherAnimals: 'Compatible with other animals',
                  }[key]
                }
              </span>
              <select
                value={details[key] == null ? '' : String(details[key])}
                onChange={(event) =>
                  setDetails({
                    ...details,
                    [key]:
                      event.target.value === ''
                        ? null
                        : Number(event.target.value),
                  })
                }
              >
                <option value="">Unknown</option>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </label>
          ))}
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            disabled={saving}
            onClick={close}
          >
            Cancel
          </button>
          <button className="button primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Greyhound'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
