import { useState } from 'react'
import type { ReactElement } from 'react'

interface FieldHelpProps {
  id: string
  fieldName: string
  reason: string
}

export function FieldHelp({
  id,
  fieldName,
  reason,
}: FieldHelpProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <span
      className={`field-help${isOpen ? ' is-open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsOpen(false)
        }
      }}
    >
      <button
        type="button"
        className="field-help__trigger"
        aria-label={`Why we ask for ${fieldName}`}
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false)
        }}
      >
        ?
      </button>
      <span className="field-help__tooltip" id={id} role="tooltip">
        <span>
          <strong>Why we ask</strong>
          {reason}
        </span>
        <span>
          <strong>Privacy</strong>
          Only you and signed-in GAP staff can view this information in the
          portal.
        </span>
        <span>
          <strong>Protection</strong>
          Access is limited by account role. Your application data remains in
          this browser on this device.
        </span>
      </span>
    </span>
  )
}
