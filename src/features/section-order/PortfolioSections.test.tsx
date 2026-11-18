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

function Editor() {
  const state = useSectionOrder(true)
  return (
    <main>
      <output>{state.status}</output>
      <PortfolioSections sections={sections} order={state.order} editing={state.ready}
        saving={state.saving} onPreview={state.preview} onCancel={state.cancel}
        onSave={() => void state.save('test-access')} />
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
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[1]).toEqual(['/api/sections/order', {
    method: 'PUT', headers: { Authorization: 'Bearer test-access', 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys: moved }),
  }])
  complete(Response.json({ keys: moved }))
  expect(await screen.findByText('Saved')).toBeInTheDocument()
  view.unmount()
  render(<Editor />)
  await waitFor(() => expect(visibleOrder()).toEqual(moved))
})

test('cancels with Escape and rolls back a rejected save without changing section content', async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
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

test('restores the confirmed order when a successful save returns a different order', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ keys: defaults }))
    .mockResolvedValueOnce(Response.json({ keys: [...defaults].reverse() })))
  const user = userEvent.setup()
  render(<Editor />)
  const handle = await screen.findByRole('button', { name: 'Reorder Selected Work' })
  await user.click(handle)
  expect(handle).toHaveAttribute('aria-pressed', 'true')
  await user.keyboard('{ArrowDown}')
  expect(visibleOrder()).toEqual(moved)
  await user.click(handle)

  expect(await screen.findByText('Could not save. Previous order restored.')).toBeInTheDocument()
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
  await screen.findByRole('button', { name: 'Reorder Selected Work' })
  expect(visibleOrder()).toEqual(defaults)
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
