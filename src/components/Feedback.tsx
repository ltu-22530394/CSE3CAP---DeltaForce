import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { PropsWithChildren } from 'react'
import { Icon } from './Icon'
const FeedbackContext = createContext<(message: string) => void>(
  () => undefined,
)
export function FeedbackProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const notify = useCallback((text: string) => {
    clearTimeout(timer.current)
    setMessage(text)
    timer.current = setTimeout(() => setMessage(''), 5000)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message && (
          <div className="toast">
            <Icon name="check" />
            <span>{message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setMessage('')}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </div>
    </FeedbackContext.Provider>
  )
}
export const useFeedback = () => useContext(FeedbackContext)
