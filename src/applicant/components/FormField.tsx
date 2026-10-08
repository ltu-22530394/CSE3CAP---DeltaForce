import { useState } from 'react'
import type { InputHTMLAttributes, ReactElement } from 'react'
import { FieldHelp } from './FieldHelp'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
  helpText?: string
}

export function FormField({
  id,
  label,
  error,
  helpText,
  type = 'text',
  ...inputProps
}: FormFieldProps): ReactElement {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && passwordVisible ? 'text' : type
  const errorId = `${id}-error`

  return (
    <div className="form-field">
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
      <div className={isPassword ? 'password-input' : undefined}>
        <input
          id={id}
          type={inputType}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [helpText ? `${id}-help` : '', error ? errorId : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          {...inputProps}
        />
        {isPassword && (
          <button
            className="password-input__toggle"
            type="button"
            aria-label={passwordVisible ? `Hide ${label}` : `Show ${label}`}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
