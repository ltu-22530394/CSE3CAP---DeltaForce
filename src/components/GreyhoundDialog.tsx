import { useEffect, useRef, useState } from 'react'
import type {
  Greyhound,
  GreyhoundEditableStatus,
  GreyhoundSex,
} from '../api/model'
import { staffApi } from '../api/staffApi'
import { Icon } from './Icon'

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
  const [age, setAge] = useState(greyhound?.age ? String(greyhound.age) : '')
  const [sex, setSex] = useState<GreyhoundSex>(greyhound?.sex ?? 'Female')
  const [status, setStatus] = useState<GreyhoundEditableStatus>(
    greyhound?.status === 'medical_hold' ? 'medical_hold' : 'available',
  )
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
        id: greyhound?.id,
        name,
        age: Number(age),
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
              min="1"
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
            </select>
          </label>
        </div>
        <label className="field">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as GreyhoundEditableStatus)
            }
          >
            <option value="available">Available</option>
            <option value="medical_hold">Medical hold</option>
          </select>
        </label>
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
