import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { AuthControl } from './AuthControl'
import { getAccount, refreshSession, signIn, signOut } from './authSession'
import { LanguageProvider, languageStorageKey } from '../../i18n/language'

const request = vi.fn<typeof fetch>()
const session = () => ({ accessToken: 'test-access', expiresAt: new Date(Date.now() + 300_000).toISOString() })
const unauthorized = () => new Response(null, { status: 401 })
const account = (role = 'Admin') => Response.json({ id: '1', email: 'owner@example.com', role })

function renderAuth() {
  return render(
    <LanguageProvider><AuthControl>
      {({ control, toolbar, editing }) => (
        <>
          {toolbar}
          {control}
          <main data-editing={editing || undefined}><section><h2>Selected work</h2></section></main>
        </>
      )}
    </AuthControl></LanguageProvider>,
  )
}

// jsdom does not implement the dialog's native modal lifecycle.
const dialogPrototype = HTMLDialogElement.prototype
const dialogMethods = {
  showModal(this: HTMLDialogElement) { this.open = true },
  close(this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  },
}
const missingMethods = (Object.keys(dialogMethods) as Array<keyof typeof dialogMethods>)
  .filter(method => typeof dialogPrototype[method] !== 'function')
beforeAll(() => {
  for (const method of missingMethods) {
    Object.defineProperty(dialogPrototype, method, { configurable: true, value: dialogMethods[method] })
  }
})
afterAll(() => {
  for (const method of missingMethods) Reflect.deleteProperty(dialogPrototype, method)
  vi.unstubAllGlobals()
})

beforeEach(() => {
  request.mockReset()
  vi.stubGlobal('fetch', request)
})

afterEach(() => {
  localStorage.removeItem(languageStorageKey)
  document.documentElement.lang = ''
  document.title = ''
})

test('localizes form validation and API errors in place without clearing the fields', async () => {
  request.mockResolvedValueOnce(unauthorized())
    .mockResolvedValueOnce(Response.json({ setupRequired: false }))
    .mockResolvedValueOnce(Response.json({ message: 'Invalid email or password.' }, { status: 401 }))
  const user = userEvent.setup()
  renderAuth()
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'Sign in' }))
  const email = await dialog.findByLabelText('Email')
  await user.click(dialog.getByRole('button', { name: 'Sign in' }))
  expect(email).toHaveFocus()
  expect(dialog.getByRole('alert')).toHaveTextContent('Enter a valid email address.')

  const language = dialog.getByRole('switch', { name: 'EN / SR, Serbian language' })
  await user.click(language)
  expect(dialog.getByRole('alert')).toHaveTextContent('Unesi ispravnu adresu e-pošte.')
  expect(dialog.getByLabelText('E-pošta')).toBe(email)
  await user.type(email, 'owner@example.com')
  await user.type(dialog.getByLabelText('Lozinka'), 'test passphrase')
  await user.click(dialog.getByRole('button', { name: 'Prijava' }))
  expect(await dialog.findByRole('alert')).toHaveTextContent('Adresa e-pošte ili lozinka nije ispravna.')
  await user.click(language)
  expect(dialog.getByRole('alert')).toHaveTextContent('Invalid email or password.')
  expect(email).toHaveValue('owner@example.com')
  expect(dialog.getByLabelText('Password')).toHaveValue('test passphrase')
})

test('clears credentials when setup is dismissed but keeps them during a language change', async () => {
  request.mockResolvedValueOnce(unauthorized())
    .mockImplementation(async () => Response.json({ setupRequired: true }))
  const user = userEvent.setup()
  renderAuth()
  const trigger = screen.getByRole('button', { name: 'Sign in' })
  await user.click(trigger)
  const modal = within(await screen.findByRole('dialog', { name: 'Create administrator' }))
  await user.type(modal.getByLabelText('Password'), 'a test passphrase')
  await user.type(modal.getByLabelText('Setup code'), 'test setup code')
  await user.click(modal.getByRole('switch', { name: 'EN / SR, Serbian language' }))
  expect(modal.getByLabelText('Lozinka')).toHaveValue('a test passphrase')
  expect(modal.getByLabelText('Kod za podešavanje')).toHaveValue('test setup code')

  await user.click(modal.getByRole('button', { name: 'Zatvori' }))
  expect(trigger).toHaveFocus()
  await user.click(trigger)
  expect(modal.getByLabelText('Lozinka')).toHaveValue('')
  expect(modal.getByLabelText('Kod za podešavanje')).toHaveValue('')
})

test('shows the login form, reports a failed login, then signs in and out', async () => {
  request.mockResolvedValueOnce(unauthorized())
    .mockResolvedValueOnce(Response.json({ setupRequired: false }))
    .mockResolvedValueOnce(Response.json({ message: 'Invalid email or password.' }, { status: 401 }))
    .mockResolvedValueOnce(Response.json(session()))
    .mockResolvedValueOnce(account())
    .mockResolvedValueOnce(account())
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  const user = userEvent.setup()
  renderAuth()
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  const modal = within(screen.getByRole('dialog', { name: 'Sign in' }))
  await user.type(await modal.findByLabelText('Email'), 'owner@example.com')
  await user.type(modal.getByLabelText('Password'), 'a long test passphrase')
  await user.click(modal.getByRole('button', { name: 'Show password' }))
  expect(modal.getByLabelText('Password')).toHaveAttribute('type', 'text')
  await user.click(modal.getByRole('button', { name: 'Sign in' }))
  expect(await modal.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  await user.click(modal.getByRole('button', { name: 'Sign in' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: 'Account' }))
  expect(await screen.findByText('owner@example.com')).toBeInTheDocument()
  expect(request.mock.calls[5][1]?.headers).toEqual({ Authorization: 'Bearer test-access' })
  await user.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(request.mock.calls[6][0]).toBe('/api/auth/logout')
})

test('offers administrator setup and sends the code only in the setup request', async () => {
  request.mockResolvedValueOnce(unauthorized())
    .mockResolvedValueOnce(Response.json({ setupRequired: true }))
    .mockResolvedValueOnce(Response.json(session()))
    .mockResolvedValueOnce(account())
  const user = userEvent.setup()
  renderAuth()
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  const modal = within(await screen.findByRole('dialog', { name: 'Create administrator' }))
  await user.type(modal.getByLabelText('Email'), 'owner@example.com')
  await user.type(modal.getByLabelText('Password'), 'a long test passphrase')
  await user.type(modal.getByLabelText('Setup code'), 'local-setup-code')
  await user.click(modal.getByRole('button', { name: 'Create account' }))
  expect(await screen.findByRole('button', { name: 'Account' })).toBeInTheDocument()
  expect(await screen.findByRole('complementary', { name: 'Administrator controls' })).toBeInTheDocument()
  const [path, options] = request.mock.calls[2]
  expect(path).toBe('/api/auth/signup')
  expect(new Headers(options?.headers).get('X-Portfolio-Setup')).toBe('local-setup-code')
  expect(options?.body).not.toContain('local-setup-code')
})

test('restores a session on mount and shares concurrent refresh requests', async () => {
  request.mockResolvedValueOnce(Response.json(session())).mockResolvedValueOnce(account())
  renderAuth()
  const first = refreshSession()
  expect(refreshSession()).toBe(first)
  expect(await screen.findByRole('button', { name: 'Account' })).toBeInTheDocument()
  expect(request.mock.calls.filter(([path]) => path === '/api/auth/refresh')).toHaveLength(1)
  expect(request.mock.calls[0][0]).toBe('/api/auth/refresh')
})

test('an expired access token is refreshed before retrying the account request', async () => {
  request.mockResolvedValueOnce(Response.json(session()))
    .mockResolvedValueOnce(account())
    .mockResolvedValueOnce(unauthorized())
    .mockResolvedValueOnce(Response.json({ ...session(), accessToken: 'renewed-access' }))
    .mockResolvedValueOnce(account())
  const user = userEvent.setup()
  renderAuth()
  await user.click(await screen.findByRole('button', { name: 'Account' }))
  expect(await screen.findByText('owner@example.com')).toBeInTheDocument()
  expect(request.mock.calls.map(([path]) => path)).toEqual([
    '/api/auth/refresh', '/api/auth/me', '/api/auth/me', '/api/auth/refresh', '/api/auth/me',
  ])
  expect(request.mock.calls[4][1]?.headers).toEqual({ Authorization: 'Bearer renewed-access' })
})

test('keeps the public entry available when refresh fails and shows an auth service error', async () => {
  request.mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
  const user = userEvent.setup()
  renderAuth()
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('authentication service is unavailable')
})

test('clears the local session after the access and refresh tokens are rejected', async () => {
  request.mockResolvedValueOnce(Response.json(session()))
    .mockResolvedValueOnce(account())
    .mockResolvedValueOnce(unauthorized())
    .mockResolvedValueOnce(unauthorized())
  const user = userEvent.setup()
  renderAuth()
  await user.click(await screen.findByRole('button', { name: 'Account' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Your session expired. Sign in again.')
  expect(screen.queryByRole('button', { name: 'Account' })).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: 'Sign in' })).toBeInTheDocument()
})

test('renews access before expiry and clears the session when the renewal fails', async () => {
  vi.useFakeTimers()
  try {
    request.mockResolvedValueOnce(Response.json(session()))
      .mockResolvedValueOnce(account())
      .mockResolvedValueOnce(Response.json({ ...session(), accessToken: 'renewed-access',
        expiresAt: new Date(Date.now() + 570_000).toISOString() }))
      .mockResolvedValueOnce(unauthorized())
    await act(async () => { renderAuth() })
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(270_000) })
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument()
    expect(request).toHaveBeenCalledTimes(3)

    screen.getByRole('button', { name: 'Editing mode' }).focus()
    await act(async () => { await vi.advanceTimersByTimeAsync(270_000) })
    const trigger = screen.getByRole('button', { name: 'Sign in' })
    expect(trigger).toHaveFocus()
    expect(request.mock.calls.filter(([path]) => path === '/api/auth/refresh')).toHaveLength(3)
    expect(screen.queryByRole('complementary', { name: 'Administrator controls' })).not.toBeInTheDocument()
    request.mockResolvedValueOnce(Response.json({ setupRequired: false }))
    await act(async () => { fireEvent.click(trigger) })
    expect(screen.getByRole('alert')).toHaveTextContent('Your session expired. Sign in again.')
  } finally {
    vi.useRealTimers()
  }
})

test('does not show administrator controls to an authenticated non-admin account', async () => {
  request.mockResolvedValueOnce(Response.json(session())).mockResolvedValueOnce(account('Viewer'))
  renderAuth()
  await screen.findByRole('button', { name: 'Account' })
  expect(screen.queryByRole('complementary', { name: 'Administrator controls' })).not.toBeInTheDocument()
})

test('editing is a reversible preview and signing out removes administrator controls', async () => {
  request.mockResolvedValueOnce(Response.json(session()))
    .mockResolvedValueOnce(account())
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  const user = userEvent.setup()
  renderAuth()

  const toolbar = within(await screen.findByRole('complementary', { name: 'Administrator controls' }))
  const edit = toolbar.getByRole('button', { name: 'Editing mode', pressed: false })
  const main = screen.getByRole('main')
  const section = within(main).getByRole('heading', { name: 'Selected work' })
  await user.click(edit)
  expect(edit).toHaveAttribute('aria-pressed', 'true')
  expect(main).toHaveAttribute('data-editing', 'true')
  expect(within(main).getByRole('heading', { name: 'Selected work' })).toBe(section)
  await user.click(edit)
  expect(main).not.toHaveAttribute('data-editing')
  expect(request).toHaveBeenCalledTimes(2)
  await user.click(edit)

  await user.click(toolbar.getByRole('button', { name: 'Logout' }))
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  expect(screen.queryByRole('complementary', { name: 'Administrator controls' })).not.toBeInTheDocument()
  expect(main).not.toHaveAttribute('data-editing')
  expect(request.mock.calls[2][0]).toBe('/api/auth/logout')
})

test.each([
  ['a successful account read', account],
  ['an unauthorized account read', unauthorized],
])('ignores %s from restoration after a newer login and logout', async (_description, lateResponse) => {
  let completeRestore!: (response: Response) => void
  request.mockResolvedValueOnce(Response.json(session()))
    .mockImplementationOnce(() => new Promise(resolve => { completeRestore = resolve }))
    .mockResolvedValueOnce(Response.json({ setupRequired: false }))
    .mockResolvedValueOnce(Response.json({ ...session(), accessToken: 'new-login' }))
    .mockResolvedValueOnce(account())
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValue(unauthorized())
  const user = userEvent.setup()
  renderAuth()
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2))

  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  const modal = within(screen.getByRole('dialog', { name: 'Sign in' }))
  await user.type(await modal.findByLabelText('Email'), 'owner@example.com')
  await user.type(modal.getByLabelText('Password'), 'a long test passphrase')
  await user.click(modal.getByRole('button', { name: 'Sign in' }))
  await user.click(within(await screen.findByRole('complementary', { name: 'Administrator controls' }))
    .getByRole('button', { name: 'Logout' }))
  await act(async () => { completeRestore(lateResponse()) })

  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  expect(screen.queryByRole('complementary', { name: 'Administrator controls' })).not.toBeInTheDocument()
  expect(request.mock.calls.map(([path]) => path)).toEqual([
    '/api/auth/refresh', '/api/auth/me', '/api/auth/setup-status',
    '/api/auth/login', '/api/auth/me', '/api/auth/logout',
  ])
})

test('only the remounted control restores a pending session', async () => {
  let completeRefresh!: (response: Response) => void
  request.mockImplementationOnce(() => new Promise(resolve => { completeRefresh = resolve }))
    .mockResolvedValueOnce(account())
  const initial = renderAuth()
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
  initial.unmount()
  renderAuth()
  await act(async () => { completeRefresh(Response.json(session())) })
  expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument()
  expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/refresh', '/api/auth/me'])
})

test.each([
  ['a malformed expiry', () => ({ ...session(), expiresAt: 'not-a-timestamp' })],
  ['an expired timestamp', () => ({ ...session(), expiresAt: new Date(Date.now() - 60_000).toISOString() })],
  ['a missing token', () => ({ expiresAt: session().expiresAt })],
])('keeps the public UI available when refresh returns %s', async (_description, payload) => {
  request.mockResolvedValueOnce(Response.json(payload()))
    .mockResolvedValue(unauthorized())
  await act(async () => { renderAuth() })

  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  expect(screen.queryByRole('complementary', { name: 'Administrator controls' })).not.toBeInTheDocument()
  expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/refresh'])
})

test('keeps cookie changes in order when logout supersedes an in-flight login without Web Locks', async () => {
  vi.stubGlobal('navigator', { locks: undefined })
  let completeLogin!: (response: Response) => void
  request.mockImplementationOnce(() => new Promise(resolve => { completeLogin = resolve }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  const signingIn = signIn('owner@example.com', 'a long test passphrase')
  const superseded = expect(signingIn).rejects.toMatchObject({ issue: 'superseded' })
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1))

  const signingOut = signOut()
  expect(await refreshSession()).toBeNull()
  expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/login'])
  completeLogin(Response.json(session()))
  await superseded
  await signingOut

  expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/login', '/api/auth/logout'])
})

test('shows the existing service error if setup status is not a boolean', async () => {
  request.mockResolvedValueOnce(unauthorized())
    .mockResolvedValueOnce(Response.json({ setupRequired: 'false' }))
  const user = userEvent.setup()
  renderAuth()
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('The authentication service is unavailable. Try again.')
  expect(screen.queryByLabelText('Setup code')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
})

test('does not enable administration when the account response is missing its identity', async () => {
  request.mockResolvedValueOnce(Response.json(session()))
    .mockResolvedValueOnce(Response.json({ email: 'owner@example.com', role: 'Admin' }))
  await act(async () => { renderAuth() })
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  expect(screen.queryByRole('complementary', { name: 'Administrator controls' })).not.toBeInTheDocument()
})

test('a late account rejection does not renew an already cleared session again', async () => {
  let completeAccount!: (response: Response) => void
  request.mockResolvedValueOnce(Response.json(session()))
    .mockImplementationOnce(() => new Promise(resolve => { completeAccount = resolve }))
    .mockResolvedValue(unauthorized())
  const active = await signIn('owner@example.com', 'a long test passphrase')
  const accountRead = getAccount(active)
  const rejected = expect(accountRead).rejects.toMatchObject({ status: 401 })
  expect(await refreshSession()).toBeNull()
  completeAccount(unauthorized())
  await rejected

  expect(request.mock.calls.map(([path]) => path)).toEqual([
    '/api/auth/login', '/api/auth/me', '/api/auth/refresh',
  ])
})

test('shows the restored account in a dialog opened before restoration finishes', async () => {
  let completeRestore!: (response: Response) => void
  const restored = session()
  request.mockResolvedValueOnce(Response.json(restored))
    .mockImplementationOnce(() => new Promise(resolve => { completeRestore = resolve }))
    .mockResolvedValueOnce(Response.json({ setupRequired: false }))
  const user = userEvent.setup()
  renderAuth()
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  await act(async () => { completeRestore(account()) })
  const dialog = within(screen.getByRole('dialog', { name: 'Account' }))
  expect(dialog.getByText('owner@example.com')).toBeInTheDocument()
  expect(dialog.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
})

test('releases the cookie operation queue after a stalled response times out', async () => {
  vi.stubGlobal('navigator', { locks: undefined })
  vi.useFakeTimers()
  try {
    request.mockImplementationOnce((_path, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    const stalled = refreshSession()
    await vi.advanceTimersByTimeAsync(0)
    const queued = signOut()
    await vi.advanceTimersByTimeAsync(10000)
    expect(await stalled).toBeNull()
    await queued
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/refresh', '/api/auth/logout'])
  } finally {
    vi.useRealTimers()
  }
})

test('returns to sign-in and clears setup credentials if setup closes during signup', async () => {
  request.mockResolvedValueOnce(unauthorized())
    .mockResolvedValueOnce(Response.json({ setupRequired: true }))
    .mockResolvedValueOnce(new Response(null, { status: 409 }))
  const user = userEvent.setup()
  renderAuth()
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  const setup = within(await screen.findByRole('dialog', { name: 'Create administrator' }))
  fireEvent.input(setup.getByLabelText('Email'), { target: { value: 'owner@example.com' } })
  fireEvent.input(setup.getByLabelText('Password'), { target: { value: 'a long test passphrase' } })
  fireEvent.input(setup.getByLabelText('Setup code'), { target: { value: 'test setup code' } })
  await user.click(setup.getByRole('button', { name: 'Create account' }))

  const dialog = within(await screen.findByRole('dialog', { name: 'Sign in' }))
  expect(dialog.getByRole('alert')).toHaveTextContent('Setup is closed.')
  expect(dialog.getByLabelText('Password')).toHaveValue('')
  expect(dialog.queryByLabelText('Setup code')).not.toBeInTheDocument()
})
