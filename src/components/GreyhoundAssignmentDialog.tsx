import { useEffect, useRef, useState } from 'react'
import type { Application, Greyhound } from '../api/model'
import { staffApi } from '../api/staffApi'
import { Icon } from './Icon'
import { greyhoundStatusLabels } from '../api/model'

export function GreyhoundAssignmentDialog({
  application,
  close,
  complete,
}: {
  application: Application
  close: () => void
  complete: (updated: Application) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const firstOption = useRef<HTMLInputElement>(null)
  const [greyhounds, setGreyhounds] = useState<Greyhound[] | null>(null)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [startDate, setStartDate] = useState(
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  )
  const [endDate, setEndDate] = useState('')
  const [note, setNote] = useState('')
  const submitting = useRef(false)

  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement
    let active = true
    element?.showModal()
    void staffApi
      .listGreyhounds()
      .then((items) => {
        if (active) setGreyhounds(items)
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Greyhounds could not be loaded. Please try again.',
          )
      })
    return () => {
      active = false
      element?.close()
      previous?.focus()
    }
  }, [])

  async function submit() {
    if (submitting.current) return
    if (!selected) {
      setError('Select a greyhound to continue.')
      firstOption.current?.focus()
      return
    }
    submitting.current = true
    setSaving(true)
    setError('')
    try {
      complete(
        await staffApi.assignGreyhound(
          application.id,
          selected,
          application.revision,
          { startDate, endDate, note },
        ),
      )
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'The greyhound could not be assigned. Please try again.',
      )
      submitting.current = false
      setSaving(false)
    }
  }

  const available = greyhounds?.filter(
    (greyhound) => greyhound.status === 'available',
  )
  const selectedGreyhound = available?.find((item) => item.id === selected)

  return (
    <dialog
      ref={dialog}
      className="decision-dialog assignment-dialog"
      aria-labelledby="assignment-title"
      aria-describedby="assignment-copy"
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
      <p className="eyebrow">{application.id}</p>
      <h2 id="assignment-title">Assign a Greyhound</h2>
      <p id="assignment-copy">
        Choose a greyhound for <strong>{application.form.fullName}</strong>.
      </p>
      <p>
        {application.form.email} / {application.form.suburb} /{' '}
        {application.form.childrenInHome} children / Current pets:{' '}
        {application.form.hasCurrentPets}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        noValidate
      >
        <fieldset className="greyhound-options" disabled={saving}>
          <legend>Available greyhounds</legend>
          {greyhounds === null && !error && (
            <p className="muted">Loading greyhounds…</p>
          )}
          {available?.length === 0 && (
            <p className="muted">No greyhounds are currently available.</p>
          )}
          {available?.map((greyhound, index) => (
            <label className="greyhound-option" key={greyhound.id}>
              <input
                ref={index === 0 ? firstOption : undefined}
                type="radio"
                name="greyhound"
                value={greyhound.id}
                checked={selected === greyhound.id}
                onChange={() => {
                  setSelected(greyhound.id)
                  setError('')
                }}
              />
              <span className="greyhound-identity">
                <strong>{greyhound.name}</strong>
                <span>
                  {greyhound.identifier || greyhound.id} · {greyhound.age} years
                  · {greyhound.sex}
                </span>
              </span>
              <span className="greyhound-status">
                {greyhoundStatusLabels[greyhound.status]}
              </span>
            </label>
          ))}
        </fieldset>
        {selectedGreyhound && (
          <dl className="contact-summary">
            <div>
              <dt>Location / colour</dt>
              <dd>
                {selectedGreyhound.location || '-'} /{' '}
                {selectedGreyhound.colour || '-'}
              </dd>
            </div>
            <div>
              <dt>Care / behaviour</dt>
              <dd>
                {selectedGreyhound.careInstructions || '-'}{' '}
                {selectedGreyhound.behaviourNotes || ''}
              </dd>
            </div>
            <div>
              <dt>Children / cats compatibility</dt>
              <dd>
                {selectedGreyhound.compatibleWithChildren == null
                  ? 'Unknown'
                  : selectedGreyhound.compatibleWithChildren
                    ? 'Yes'
                    : 'No'}{' '}
                /{' '}
                {selectedGreyhound.compatibleWithCats == null
                  ? 'Unknown'
                  : selectedGreyhound.compatibleWithCats
                    ? 'Yes'
                    : 'No'}
              </dd>
            </div>
          </dl>
        )}
        <div className="management-grid">
          <label className="field">
            <span>Expected start date</span>
            <input
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Expected end date</span>
            <input
              type="date"
              min={startDate}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>Internal placement notes</span>
          <textarea
            rows={2}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
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
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={saving || !available?.length}
          >
            {saving ? 'Assigning…' : 'Assign Greyhound'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
