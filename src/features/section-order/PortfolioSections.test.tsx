import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { App } from '../../App'
import { PortfolioSections } from './PortfolioSections'
import { defaultSectionOrder as defaults } from '../../sections'
import { en } from '../../i18n/en'
import type { SectionKey } from '../../sections'
import { useSectionOrder } from './useSectionOrder'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'
import { LanguageProvider, languageStorageKey } from '../../i18n/language'

const moved = [defaults[1], defaults[0], ...defaults.slice(2)]
const fixed = ['top', 'request-flow']
const sections = Object.fromEntries(defaults.map(key => [
  key, <section key={key} id={key}><h2>{en.sections[key].title}</h2></section>,
])) as Record<SectionKey, React.JSX.Element>

function Editor({ renew }: { renew?: () => Promise<string | undefined> }) {
  const state = useSectionOrder(true)
  return (
    <main>
      <output>{state.status}</output>
      <PortfolioSections sections={sections} order={state.order} editing={state.orderLoaded}
        saving={state.saving} onPreview={state.preview} onCancel={state.cancel}
        onSave={() => void state.save('test-access', renew)} />
    </main>
  )
}

function visibleOrder() {
  return [...screen.getByRole('main').querySelectorAll('section[id]')].map(section => section.id)
}

beforeEach(() => {
  if (!Element.prototype.scrollIntoView) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  }
})

afterEach(() => localStorage.removeItem(languageStorageKey))

test.each([
  { button: 'Move Selected Work down', announcement: 'Selected Work moved to position 2 of 6.', atBoundary: false },
  { button: 'Move Technical Skills up', announcement: 'Technical Skills moved to position 1 of 6.', atBoundary: true },
])('saves the new order after a single click on $button', async ({ button, announcement, atBoundary }) => {
  let complete!: (response: Response) => void
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
  vi.stubGlobal('fetch', fetcher)
  const user = userEvent.setup()
  render(<Editor />)

  const moveButton = await screen.findByRole('button', { name: button })
  await user.click(moveButton)

  expect(visibleOrder()).toEqual(moved)
  expect(screen.getByText(announcement)).toHaveRole('status')
  expect(screen.getByText('Saving…')).toBeInTheDocument()
  expect(moveButton).toHaveAttribute('aria-disabled', 'true')
  expect(moveButton).toHaveFocus()
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher).toHaveBeenLastCalledWith('/api/sections/order', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({ keys: moved, expectedKeys: defaults }),
  }))

  await user.click(moveButton)
  expect(visibleOrder()).toEqual(moved)
  expect(fetcher).toHaveBeenCalledTimes(2)

  complete(Response.json({ keys: moved }))
  expect(await screen.findByText('Saved')).toBeInTheDocument()
  expect(moveButton).toHaveFocus()
  if (atBoundary) expect(moveButton).toHaveAttribute('aria-disabled', 'true')
  else expect(moveButton).not.toHaveAttribute('aria-disabled', 'true')
})

test('disables moves past the first and last sections', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ keys: defaults }))
  vi.stubGlobal('fetch', fetcher)
  const user = userEvent.setup()
  render(<Editor />)

  const firstUp = await screen.findByRole('button', { name: 'Move Selected Work up' })
  const lastDown = screen.getByRole('button', { name: 'Move Contact down' })
  expect(firstUp).toHaveAttribute('aria-disabled', 'true')
  expect(lastDown).toHaveAttribute('aria-disabled', 'true')
  expect(screen.getByRole('button', { name: 'Move Selected Work down' })).not.toHaveAttribute('aria-disabled', 'true')
  expect(screen.getByRole('button', { name: 'Move Contact up' })).not.toHaveAttribute('aria-disabled', 'true')

  await user.click(firstUp)
  await user.click(lastDown)

  expect(visibleOrder()).toEqual(defaults)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('saves only the confirmed final order, then reloads that order from the API', async () => {
  let complete!: (response: Response) => void
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    .mockResolvedValueOnce(Response.json({ keys: moved }))
  vi.stubGlobal('fetch', fetcher)
  const user = userEvent.setup()
  const view = render(<Editor />)
  const handle = await screen.findByRole('button', { name: 'Reorder Selected Work' })
  handle.focus()
  await user.keyboard('{Enter}{ArrowDown}')
  expect(visibleOrder()).toEqual(moved)
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  expect(fetcher).toHaveBeenCalledTimes(1)
  await user.keyboard('{Enter}')
  expect(screen.getByText('Saving…')).toBeInTheDocument()
  expect(handle).toHaveFocus()
  expect(handle).toHaveAttribute('aria-disabled', 'true')
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[1]).toEqual(['/api/sections/order', {
    method: 'PUT', headers: { Authorization: 'Bearer test-access', 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys: moved, expectedKeys: defaults }), signal: expect.any(AbortSignal),
  }])
  complete(Response.json({ keys: moved }))
  expect(await screen.findByText('Saved')).toBeInTheDocument()
  expect(handle).toHaveFocus()
  view.unmount()
  render(<Editor />)
  await waitFor(() => expect(visibleOrder()).toEqual(moved))
})

test('cancels with Escape and rolls back a rejected save without changing section content', async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockResolvedValueOnce(new Response(null, { status: 400 }))
  vi.stubGlobal('fetch', fetcher)
  const user = userEvent.setup()
  render(<Editor />)
  const handle = await screen.findByRole('button', { name: 'Reorder Selected Work' })
  const content = screen.getByRole('heading', { name: 'Selected Work' })
  handle.focus()
  await user.keyboard('{Enter}{ArrowDown}{Escape}')
  expect(visibleOrder()).toEqual(defaults)
  expect(fetcher).toHaveBeenCalledTimes(1)
  await user.keyboard('{Enter}{ArrowDown}{Enter}')
  expect(await screen.findByText('Could not save. Previous order restored.')).toBeInTheDocument()
  expect(visibleOrder()).toEqual(defaults)
  expect(screen.getByRole('heading', { name: 'Selected Work' })).toBe(content)
})

test('preserves a keyboard move when switching languages and still cancels on unrelated focus', async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockResolvedValueOnce(Response.json({ keys: moved }))
  vi.stubGlobal('fetch', fetcher)
  const user = userEvent.setup()
  render(<LanguageProvider><LanguageSwitch /><button type="button">Other control</button><Editor /></LanguageProvider>)
  const handle = await screen.findByRole('button', { name: 'Reorder Selected Work' })
  const language = screen.getByRole('switch', { name: 'EN / SR, Serbian language' })

  handle.focus()
  await user.keyboard('{Enter}{ArrowDown}')
  await user.click(language)
  expect(handle).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('Nesačuvane izmene')).toBeInTheDocument()
  expect(visibleOrder()).toEqual(moved)
  expect(fetcher).toHaveBeenCalledTimes(1)
  handle.focus()
  await user.keyboard('{Enter}')
  expect(await screen.findByText('Sačuvano')).toBeInTheDocument()

  handle.focus()
  await user.keyboard('{Enter}{ArrowUp}')
  await user.click(language)
  expect(visibleOrder()).toEqual(defaults)
  await user.click(screen.getByRole('button', { name: 'Other control' }))
  expect(handle).toHaveAttribute('aria-pressed', 'false')
  expect(visibleOrder()).toEqual(moved)
  expect(fetcher).toHaveBeenCalledTimes(2)
})

test('renders the bundled public portfolio when no API is configured', () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('location', new URL('http://localhost/'))
  render(<App />)
  expect(visibleOrder()).toEqual([...fixed, ...defaults])
  expect(screen.queryByRole('button', { name: /Reorder/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Move Selected Work down' })).not.toBeInTheDocument()
  expect(fetcher).not.toHaveBeenCalled()
})

test('uses the saved order for both the public sections and navigation', async () => {
  vi.stubGlobal('location', new URL('https://localhost/'))
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async input => input === '/api/sections/order'
    ? Response.json({ keys: moved })
    : new Response(null, { status: 401 })))
  render(<App />)

  await waitFor(() => expect(visibleOrder()).toEqual([...fixed, ...moved]))
  const navigation = screen.getByRole('navigation', { name: 'Main navigation' })
  expect(within(navigation).getAllByRole('link').map(link => link.getAttribute('href')))
    .toEqual(moved.map(key => `#${key}`))
})

test('locks editing if a read after an uncertain save cannot confirm the submitted order', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockResolvedValueOnce(Response.json({ keys: [...defaults].reverse() }))
    .mockResolvedValueOnce(Response.json({ keys: defaults })))
  const user = userEvent.setup()
  render(<Editor />)
  const handle = await screen.findByRole('button', { name: 'Reorder Selected Work' })
  await user.click(handle)
  expect(handle).toHaveAttribute('aria-pressed', 'true')
  await user.keyboard('{ArrowDown}')
  expect(visibleOrder()).toEqual(moved)
  await user.click(handle)

  expect(await screen.findByText('Could not confirm the saved order. Reload before editing.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Reorder Selected Work' })).not.toBeInTheDocument()
  expect(visibleOrder()).toEqual(defaults)
})

test('keeps the public portfolio available when its configured API is offline', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }))
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('location', new URL('https://localhost/'))
  render(<App />)
  await waitFor(() => expect(fetcher.mock.calls.some(([path]) => path === '/api/sections/order')).toBe(true))
  expect(visibleOrder()).toEqual([...fixed, ...defaults])
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Reorder/ })).not.toBeInTheDocument()
})

test.each([
  ['a repeated section', [...defaults.slice(1), defaults[1]]],
  ['the fixed hero', ['top', ...defaults.slice(1)]],
])('keeps the bundled order when the server returns %s', async (_label, keys) => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ keys })))
  render(<Editor />)
  expect(await screen.findByText('Could not load the saved order. Reload before editing.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Reorder Selected Work' })).not.toBeInTheDocument()
  expect(visibleOrder()).toEqual(defaults)
})

test('reads back a write whose response was lost before classifying it as saved', async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockRejectedValueOnce(new TypeError('Response interrupted'))
    .mockResolvedValueOnce(Response.json({ keys: moved }))
  vi.stubGlobal('fetch', fetcher)
  const user = userEvent.setup()
  render(<Editor />)
  const handle = await screen.findByRole('button', { name: 'Reorder Selected Work' })
  handle.focus()
  await user.keyboard('{Enter}{ArrowDown}{Enter}')

  expect(await screen.findByText('Saved')).toBeInTheDocument()
  expect(visibleOrder()).toEqual(moved)
  expect(fetcher.mock.calls.map(([, options]) => options?.method ?? 'GET')).toEqual(['GET', 'PUT', 'GET'])
})

test('renews a rejected access token and retries the same order only once', async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ keys: moved }))
  vi.stubGlobal('fetch', fetcher)
  const renew = vi.fn(async () => 'renewed-token')
  const user = userEvent.setup()
  render(<Editor renew={renew} />)
  const handle = await screen.findByRole('button', { name: 'Reorder Selected Work' })
  handle.focus()
  await user.keyboard('{Enter}{ArrowDown}{Enter}')

  expect(await screen.findByText('Saved')).toBeInTheDocument()
  expect(renew).toHaveBeenCalledOnce()
  expect(fetcher.mock.calls[2][1]).toEqual({
    method: 'PUT', headers: { Authorization: 'Bearer renewed-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys: moved, expectedKeys: defaults }), signal: expect.any(AbortSignal),
  })
  expect(fetcher).toHaveBeenCalledTimes(3)
})

test('shows the latest order when another editor saves first', async () => {
  const otherOrder = [...defaults].reverse()
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockResolvedValueOnce(Response.json({ keys: otherOrder }, { status: 409 }))
  vi.stubGlobal('fetch', fetcher)
  const user = userEvent.setup()
  render(<Editor />)
  const handle = await screen.findByRole('button', { name: 'Reorder Selected Work' })
  handle.focus()
  await user.keyboard('{Enter}{ArrowDown}{Enter}')

  expect(await screen.findByText('The order changed elsewhere. The latest order is shown.')).toBeInTheDocument()
  expect(visibleOrder()).toEqual(otherOrder)
  expect(handle).toHaveFocus()
  expect(fetcher).toHaveBeenCalledTimes(2)
})

test('keeps the header, hero, request walkthrough and footer outside the reorderable area', async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    if (input === '/api/sections/order') return Response.json({ keys: defaults })
    if (input === '/api/auth/refresh') {
      return Response.json({ accessToken: 'test-access', expiresAt: new Date(Date.now() + 300_000).toISOString() })
    }
    return Response.json({ id: '1', email: 'owner@example.test', role: 'Admin' })
  })
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('location', new URL('https://localhost/'))
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Editing mode' }))
  const handles = await screen.findAllByRole('button', { name: /^Reorder / })
  expect(handles.map(handle => handle.getAttribute('aria-label'))).toEqual(
    defaults.map(key => `Reorder ${en.sections[key].title}`),
  )
  const main = screen.getByRole('main')
  expect(main.previousElementSibling).toBe(screen.getByRole('banner'))
  expect(main.firstElementChild).toHaveAttribute('id', 'top')
  const requestFlow = main.firstElementChild?.nextElementSibling
  expect(requestFlow).toHaveAttribute('id', 'request-flow')
  expect(requestFlow?.nextElementSibling).toContainElement(handles[0])
  expect(main.nextElementSibling).toBe(screen.getByRole('contentinfo'))

  handles[0].focus()
  await user.keyboard('{Enter}{ArrowUp}{Enter}')
  handles[5].focus()
  await user.keyboard('{Enter}{ArrowDown}{Enter}')
  expect(visibleOrder()).toEqual([...fixed, ...defaults])
  expect(fetcher.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false)
})
