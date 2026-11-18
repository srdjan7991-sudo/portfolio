import type { Messages } from '../../i18n/en'

export type Session = { accessToken: string; expiresAt: string }
export type Account = { id: string; email: string | null; role: string }
export type AuthIssue = keyof Messages['auth']['errors']

const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$/

let current: Session | null = null
let pendingRefresh: { revision: number; promise: Promise<Session | null> } | undefined
let signOutRevision: number | undefined
let cookieQueue = Promise.resolve()
let revision = 0

export class AuthError extends Error {
  constructor(public status: number, public issue: AuthIssue) { super(issue) }
}

function issueForResponse(route: string, status: number): AuthIssue {
  if (status === 429) return 'rateLimited'
  if (status === 403) return 'rejected'
  if (status === 400) return 'invalidInput'
  if (status === 401) return route === 'login' ? 'invalidLogin' : 'expired'
  if (status === 409 && route === 'signup') return 'setupClosed'
  return 'unavailable'
}

async function request(route: string, options: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController()
  const deadline = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(`/api/auth/${route}`, {
      ...options, signal: controller.signal, credentials: 'same-origin', cache: 'no-store',
    })
    if (!response.ok) throw new AuthError(response.status, issueForResponse(route, response.status))
    if (response.status === 204) return
    return await response.json().catch(() => { throw new AuthError(response.status, 'unavailable') })
  } finally {
    clearTimeout(deadline)
  }
}

function post(route: string, body?: { email: string; password: string }, setupKey?: string) {
  const headers = new Headers({ 'X-Portfolio-Auth': '1' })
  if (body) headers.set('Content-Type', 'application/json')
  if (setupKey) headers.set('X-Portfolio-Setup', setupKey)
  return request(route, { method: 'POST', headers, body: body && JSON.stringify(body) })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readSession(value: unknown): Session {
  if (!isRecord(value) || typeof value.accessToken !== 'string' || !value.accessToken.trim() ||
    typeof value.expiresAt !== 'string' || !timestamp.test(value.expiresAt) ||
    !(Date.parse(value.expiresAt) > Date.now())) throw new AuthError(0, 'unavailable')
  return { accessToken: value.accessToken, expiresAt: value.expiresAt }
}

async function readAccount(session: Session): Promise<Account> {
  const value = await request('me', { headers: { Authorization: `Bearer ${session.accessToken}` } })
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id ||
    (typeof value.email !== 'string' && value.email !== null) ||
    typeof value.role !== 'string' || !value.role) throw new AuthError(0, 'unavailable')
  return { id: value.id, email: value.email, role: value.role }
}

function withCookieLock<T>(action: () => Promise<T>): Promise<T> {
  if (navigator.locks) return navigator.locks.request('portfolio-auth-cookie', action)
  // Keep cookie-changing requests ordered within this document when Web Locks are unavailable.
  const next = cookieQueue.then(action)
  cookieQueue = next.then(() => undefined, () => undefined)
  return next
}

export function refreshSession(): Promise<Session | null> {
  const operation = revision
  if (signOutRevision === operation) return Promise.resolve(null)
  if (pendingRefresh?.revision === operation) return pendingRefresh.promise
  const promise = withCookieLock(async () => {
    if (operation !== revision) return null
    try {
      const value = await post('refresh')
      if (operation !== revision) return null
      current = readSession(value)
    } catch (error) {
      if (operation !== revision) return null
      current = null
      if (!(error instanceof AuthError) || error.status !== 401) throw error
    }
    return current
  }).finally(() => {
    if (pendingRefresh?.promise === promise) pendingRefresh = undefined
  })
  pendingRefresh = { revision: operation, promise }
  return promise
}

export async function signIn(email: string, password: string, setupKey?: string) {
  const operation = ++revision
  function checkOperation() {
    if (operation !== revision) throw new AuthError(0, 'superseded')
  }
  return withCookieLock(async () => {
    checkOperation()
    const value = await post(setupKey === undefined ? 'login' : 'signup', { email, password }, setupKey)
    checkOperation()
    current = readSession(value)
    return current
  })
}

export async function setupStatus() {
  const value = await request('setup-status')
  if (!isRecord(value) || typeof value.setupRequired !== 'boolean') throw new AuthError(0, 'unavailable')
  return { setupRequired: value.setupRequired }
}

export async function getAccount(session: Session): Promise<{ account: Account; session: Session }> {
  const operation = revision
  let account: Account
  try {
    account = await readAccount(session)
  } catch (error) {
    if (operation !== revision || !current || !(error instanceof AuthError) || error.status !== 401) throw error
    const recovered = current.accessToken !== session.accessToken ? current : await refreshSession()
    if (operation !== revision || !recovered) throw error
    account = await readAccount(recovered)
  }
  if (operation !== revision || !current) throw new AuthError(401, 'expired')
  return { account, session: current }
}

export async function signOut() {
  const operation = ++revision
  signOutRevision = operation
  current = null
  try {
    await withCookieLock(() => post('logout'))
  } finally {
    if (signOutRevision === operation) signOutRevision = undefined
  }
}
