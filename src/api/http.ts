export const useServerApi =
  import.meta.env.MODE !== 'test' && import.meta.env.VITE_DATA_SOURCE !== 'mock'
const API_SESSION_KEY = 'gap.api.session.v1'
export interface ApiUser {
  id: string
  applicantId: string | null
  fullName: string
  email: string
  role: 'applicant' | 'foster_carer' | 'staff' | 'admin'
  accountStatus: string
  emailVerified: boolean
}
export interface ApiSession {
  token: string
  user: ApiUser
}

export function apiSession(): ApiSession | null {
  try {
    return JSON.parse(
      window.localStorage.getItem(API_SESSION_KEY) || 'null',
    ) as ApiSession | null
  } catch {
    return null
  }
}
export function saveApiSession(session: ApiSession): void {
  window.localStorage.setItem(API_SESSION_KEY, JSON.stringify(session))
}
export function clearApiSession(): void {
  window.localStorage.removeItem(API_SESSION_KEY)
  window.localStorage.removeItem('gap.applicant.session')
  window.dispatchEvent(new Event('gap-session-change'))
}
export async function apiRequest<T>(
  path: string,
  input?: unknown,
  method = input === undefined ? 'GET' : 'POST',
): Promise<T> {
  const session = apiSession()
  const response = await fetch('/api' + path, {
    method,
    headers: {
      ...(input === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(session ? { Authorization: 'Bearer ' + session.token } : {}),
    },
    body: input === undefined ? undefined : JSON.stringify(input),
  })
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    throw new Error(
      'The server returned an unexpected response. Check that the API is running.',
    )
  }
  if (!response.ok) {
    if (
      ((response.status === 401 && !path.startsWith('/auth/login')) ||
        body?.error?.code === 'ACCOUNT_NOT_ACTIVE') &&
      apiSession()?.token === session?.token
    )
      clearApiSession()
    throw Object.assign(
      new Error(body?.error?.message || 'The request could not be completed.'),
      { code: body?.error?.code, details: body?.error?.details },
    )
  }
  return body as T
}
export async function downloadApiFile(
  path: string,
  name: string,
): Promise<void> {
  const session = apiSession()
  const response = await fetch('/api' + path, {
    headers: session ? { Authorization: 'Bearer ' + session.token } : {},
  })
  if (!response.ok) throw new Error('The download could not be completed.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
