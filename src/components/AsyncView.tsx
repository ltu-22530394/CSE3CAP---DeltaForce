import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/staffApi'
import { Icon } from './Icon'
export function useResource<T>(load: () => Promise<T>, key: string) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    key: string
    attempt: number
    data?: T
    error?: Error
  } | null>(null)
  useEffect(() => {
    let alive = true
    load()
      .then((data) => {
        if (alive) setResult({ key, attempt, data })
      })
      .catch((error: Error) => {
        if (alive) setResult({ key, attempt, error })
      })
    return () => {
      alive = false
    }
  }, [load, key, attempt])
  return {
    data:
      result?.key === key && result.attempt === attempt
        ? result.data
        : undefined,
    error:
      result?.key === key && result.attempt === attempt
        ? result.error
        : undefined,
    retry: () => setAttempt((n) => n + 1),
  }
}
export function Loading({
  label = 'Loading applications',
}: {
  label?: string
}) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {label}…
    </div>
  )
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error
  retry: () => void
}) {
  const expired = error instanceof ApiError && error.code === 'UNAUTHENTICATED'
  return (
    <div className="empty-state" role="alert">
      <h2>{expired ? 'Your session has ended' : 'Unable to load this page'}</h2>
      <p>{error.message}</p>
      {expired ? (
        <Link className="button primary" to="/login">
          Log in
        </Link>
      ) : (
        <button className="button secondary" onClick={retry}>
          <Icon name="refresh" />
          Try again
        </button>
      )}
    </div>
  )
}
