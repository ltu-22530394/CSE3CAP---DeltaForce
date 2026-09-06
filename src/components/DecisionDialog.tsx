import { useEffect, useRef, useState } from 'react'
import type { Application, Decision } from '../api/model'
import { staffApi } from '../api/staffApi'
import { Icon } from './Icon'
const labels: Record<
  Decision,
  { title: string; button: string; note: string; description: string }
> = {
  approved: {
    title: 'Approve application?',
    button: 'Approve application',
    note: 'Review note (optional)',
    description: 'This will record a final approval for',
  },
  rejected: {
    title: 'Reject application?',
    button: 'Reject application',
    note: 'Reason for rejection',
    description: 'This will record a final rejection for',
  },
  more_information: {
    title: 'Request more information',
    button: 'Save request',
    note: 'Information required',
    description: 'Record the information you need from',
  },
  in_review: {
    title: 'Start review?',
    button: 'Start review',
    note: 'Review note (optional)',
    description: 'This will mark the application as in review for',
  },
}
export function DecisionDialog({
  application,
  decision,
  close,
  complete,
}: {
  application: Application
  decision: Decision
  close: () => void
  complete: (updated: Application) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const label = labels[decision]
  const required = decision === 'rejected' || decision === 'more_information'
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement
    element?.showModal()
    return () => {
      element?.close()
      previous?.focus()
    }
  }, [])
  async function submit() {
    if (submitting.current) return
    if (required && note.trim().length < 10) {
      setError('Enter at least 10 characters so the reason is clear.')
      noteRef.current?.focus()
      return
    }
    submitting.current = true
    setSaving(true)
    setError('')
    try {
      const next = await staffApi.decide(
        application.id,
        decision,
        note,
        application.revision,
      )
      complete(next)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'The decision could not be saved. Please try again.',
      )
      submitting.current = false
      setSaving(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className="decision-dialog"
      aria-labelledby="decision-title"
      aria-describedby="decision-copy"
      onCancel={(e) => {
        e.preventDefault()
        if (!saving) close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          const rect = e.currentTarget.getBoundingClientRect()
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
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
      <h2 id="decision-title">{label.title}</h2>
      <p id="decision-copy">
        {label.description} <strong>{application.form.fullName}</strong>.
      </p>
      {decision === 'more_information' && (
        <p className="muted">The request is saved to the application record.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        noValidate
      >
        <label className="field">
          <span>
            {label.note}
            {required ? ' *' : ''}
          </span>
          <textarea
            ref={noteRef}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setError('')
            }}
            rows={5}
            maxLength={2000}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'decision-error' : 'note-hint'}
            disabled={saving}
          />
        </label>
        <div className="note-hint" id="note-hint">
          <span>
            {required
              ? 'At least 10 characters.'
              : 'Add context for your team.'}
          </span>
          <span>{note.length}/2,000</span>
        </div>
        {error && (
          <p id="decision-error" className="field-error" role="alert">
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
          <button className="button primary" disabled={saving}>
            {saving ? 'Saving…' : label.button}
          </button>
        </div>
      </form>
    </dialog>
  )
}
