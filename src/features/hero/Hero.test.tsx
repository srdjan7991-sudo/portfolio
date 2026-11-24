import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'
import { LanguageProvider, languageStorageKey } from '../../i18n/language'
import { Hero } from './Hero'

const stageDurations = [295, 235, 245, 270, 205, 310]

afterEach(() => {
  vi.useRealTimers()
})

function startClock() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
}

async function tick(milliseconds: number) {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds))
}

function queue() {
  return screen.getByRole('list', { name: 'Review queue' })
}

function refresh() {
  return screen.getByRole('button', { name: 'Refresh queue' })
}

function pin() {
  return screen.getByRole('button', { name: 'Pin first task' })
}

test('introduces the author and points both calls to action at their sections', () => {
  render(<Hero />)
  expect(screen.getByRole('heading', { level: 1, name: 'Frontend-focused Software Engineer' })).toBeInTheDocument()
  expect(screen.getByText(/over five years developing software professionally/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'View selected work' })).toHaveAttribute('href', '#work')
  expect(screen.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '#contact')
  expect(screen.getByRole('heading', { name: 'Living application architecture' })).toBeInTheDocument()
  expect(within(queue()).getAllByRole('listitem')).toHaveLength(3)
  expect(screen.getByText('Revision 1')).toBeInTheDocument()
})

test('carries a local refresh through all six hops and applies it on the final return', async () => {
  startClock()
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  render(<Hero />)
  const api = screen.getByRole('button', { name: 'API', description: 'Routes requests' })
  const service = screen.getByRole('button', { name: 'Service', description: 'Applies rules' })
  const data = screen.getByRole('button', { name: 'Data', description: 'Reads and writes records' })
  const stops = [refresh(), api, service, data, service, api]
  const labels = [
    'Sending request', 'Routing to application service', 'Accessing records',
    'Returning records to service', 'Returning response', 'Returning response',
  ]

  fireEvent.click(refresh())
  expect(screen.getByText('GET /api/queue')).toBeInTheDocument()
  for (let i = 0; i < stops.length; i++) {
    expect(stops[i]).toHaveAttribute('data-current', 'true')
    expect(screen.getByText(labels[i])).toBeInTheDocument()
    expect(queue()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Revision 1')).toBeInTheDocument()
    await tick(stageDurations[i] - (i === stops.length - 1 ? 1 : 0))
  }
  expect(queue()).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByText('Revision 1')).toBeInTheDocument()

  await tick(1)
  expect(queue()).toHaveAttribute('aria-busy', 'false')
  expect(screen.getByText('Revision 2')).toBeInTheDocument()
  expect(screen.getByText('Queue refreshed. Revision 2.', { selector: 'output' })).toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

test('replaces a pending action and permits the winning action to run again', async () => {
  startClock()
  render(<Hero />)
  const pinButton = pin()
  fireEvent.click(refresh())
  await tick(stageDurations[0])
  fireEvent.click(pinButton)
  expect(screen.getByText('PUT /api/queue/pin')).toBeInTheDocument()
  for (const duration of stageDurations) await tick(duration)

  expect(screen.getByText('Revision 1')).toBeInTheDocument()
  expect(pinButton).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('First task pinned.', { selector: 'output' })).toBeInTheDocument()

  fireEvent.click(pinButton)
  expect(pinButton).toHaveAttribute('aria-pressed', 'true')
  for (const duration of stageDurations) await tick(duration)
  expect(pinButton).toHaveAttribute('aria-pressed', 'false')
  expect(queue()).toHaveAttribute('aria-busy', 'false')
})

test('previews requests and inspects shared backend connections without changing the queue', async () => {
  startClock()
  render(<Hero />)
  const send = refresh()
  const data = screen.getByRole('button', { name: 'Data' })

  fireEvent.pointerEnter(send, { pointerType: 'mouse' })
  await tick(115)
  expect(screen.getByText('Sending request')).toBeInTheDocument()
  expect(pin()).toHaveAttribute('data-related', 'false')
  expect(queue()).toHaveAttribute('aria-busy', 'false')
  for (const duration of stageDurations) await tick(duration)
  expect(screen.getByText('Revision 1')).toBeInTheDocument()

  fireEvent.pointerLeave(send, { pointerType: 'mouse' })
  fireEvent.click(data)
  expect(data).toHaveAttribute('aria-pressed', 'true')
  expect(send).toHaveAttribute('data-related', 'true')
  expect(pin()).toHaveAttribute('data-related', 'true')
  await tick(115)
  expect(screen.getByText('Tracing back to the frontend')).toBeInTheDocument()
  expect(queue()).toHaveAttribute('aria-busy', 'false')

  fireEvent.click(data)
  expect(data).toHaveAttribute('aria-pressed', 'false')
  expect(send).toHaveAttribute('data-related', 'false')
  expect(screen.getByText('Revision 1')).toBeInTheDocument()
})

test('accepts keyboard focus previews and applies keyboard actions immediately with reduced motion', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  const user = userEvent.setup()
  render(<Hero />)

  await user.tab()
  await user.tab()
  await user.tab()
  expect(refresh()).toHaveFocus()
  expect(screen.getByText('Reads the latest review queue.')).toBeInTheDocument()
  expect(screen.getByText('Revision 1')).toBeInTheDocument()
  expect(queue()).toHaveAttribute('aria-busy', 'false')
  await user.keyboard('{Enter}')

  expect(refresh()).toHaveFocus()
  expect(screen.getByText('Revision 2')).toBeInTheDocument()
  expect(queue()).toHaveAttribute('aria-busy', 'false')
  expect(screen.getByText('Queue refreshed. Revision 2.', { selector: 'output' })).toBeInTheDocument()
})

test('replays a selected backend trace after hover and keeps it running after pointer leave', async () => {
  startClock()
  render(<Hero />)
  const data = screen.getByRole('button', { name: 'Data' })

  fireEvent.pointerEnter(data, { pointerType: 'mouse' })
  await tick(115)
  for (const duration of [235, 235, 335]) await tick(duration)
  expect(screen.getByText('Both actions use the same records.')).toBeInTheDocument()

  fireEvent.click(data)
  expect(data).toHaveAttribute('aria-pressed', 'true')
  fireEvent.pointerLeave(data, { pointerType: 'mouse' })
  expect(screen.getByText('Tracing back to the frontend')).toBeInTheDocument()
  await tick(235)
  expect(screen.getByRole('button', { name: 'Service' })).toHaveAttribute('data-current', 'true')
  expect(screen.getByText('Revision 1')).toBeInTheDocument()
})

test('runs the latest backend selection after the frontend response arrives', async () => {
  startClock()
  render(<Hero />)
  const data = screen.getByRole('button', { name: 'Data' })
  const service = screen.getByRole('button', { name: 'Service' })

  fireEvent.click(refresh())
  fireEvent.click(data)
  fireEvent.click(service)
  expect(service).toHaveAttribute('aria-pressed', 'true')
  expect(data).toHaveAttribute('aria-pressed', 'false')
  expect(queue()).toHaveAttribute('aria-busy', 'true')
  expect(screen.queryByText('Tracing back to the frontend')).not.toBeInTheDocument()

  for (const duration of stageDurations) await tick(duration)
  expect(queue()).toHaveAttribute('aria-busy', 'false')
  expect(screen.getByText('Revision 2')).toBeInTheDocument()
  expect(screen.getByText('Tracing back to the frontend')).toBeInTheDocument()
  expect(service).toHaveAttribute('data-current', 'true')
})

test('restores the focused route after a pointer exploration ends', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  const user = userEvent.setup()
  render(<Hero />)

  const focusedButton = refresh()
  const matches = focusedButton.matches.bind(focusedButton)
  vi.spyOn(focusedButton, 'matches').mockImplementation(selector => selector === ':focus-visible' || matches(selector))
  await user.tab()
  await user.tab()
  await user.tab()
  expect(focusedButton).toHaveFocus()
  expect(screen.getByText('Reads the latest review queue.')).toBeInTheDocument()
  const data = screen.getByRole('button', { name: 'Data' })
  await user.hover(data)
  expect(screen.getByText('Both actions use the same records.')).toBeInTheDocument()
  await user.unhover(data)
  expect(focusedButton).toHaveFocus()
  expect(screen.getByText('Reads the latest review queue.')).toBeInTheDocument()
})

test('finishes the active request when reduced motion is enabled', () => {
  startClock()
  const preference = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal('matchMedia', () => preference)
  render(<Hero />)

  fireEvent.click(refresh())
  expect(queue()).toHaveAttribute('aria-busy', 'true')
  act(() => {
    preference.matches = true
    preference.dispatchEvent(Object.assign(new Event('change'), { matches: true }))
  })
  expect(screen.getByText('Revision 2')).toBeInTheDocument()
  expect(queue()).toHaveAttribute('aria-busy', 'false')
})

test('preserves heading, CTA and pending action identities across language switches', async () => {
  startClock()
  const originalLang = document.documentElement.lang
  const originalTitle = document.title
  const savedLanguage = localStorage.getItem(languageStorageKey)
  localStorage.removeItem(languageStorageKey)
  try {
    render(<LanguageProvider><LanguageSwitch /><Hero /></LanguageProvider>)
    const heading = screen.getByRole('heading', { level: 1, name: 'Frontend-focused Software Engineer' })
    const work = screen.getByRole('link', { name: 'View selected work' })
    const contact = screen.getByRole('link', { name: 'Get in touch' })
    const button = refresh()
    const list = queue()

    fireEvent.click(button)
    await tick(stageDurations[0])
    fireEvent.click(screen.getByRole('switch', { name: /EN \/ SR/ }))

    expect(screen.getByRole('heading', { level: 1, name: 'Softverski inženjer za frontend' })).toBe(heading)
    expect(screen.getByRole('region', { name: 'Softverski inženjer za frontend' })).toContainElement(heading)
    expect(screen.getByRole('link', { name: 'Pogledaj projekte' })).toBe(work)
    expect(screen.getByRole('link', { name: 'Javi se' })).toBe(contact)
    expect(screen.getByRole('button', { name: 'Osveži listu' })).toBe(button)
    expect(screen.getByText('Revizija 1')).toBeInTheDocument()
    expect(list).toHaveAttribute('aria-busy', 'true')

    for (const duration of stageDurations.slice(1)) await tick(duration)
    expect(list).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByText('Revizija 2')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  } finally {
    if (savedLanguage === null) localStorage.removeItem(languageStorageKey)
    else localStorage.setItem(languageStorageKey, savedLanguage)
    document.documentElement.lang = originalLang
    document.title = originalTitle
  }
})
