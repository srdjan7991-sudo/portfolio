import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RequestFlow } from './RequestFlow'
import { phaseReadingTime, steps } from './requestFlowSteps'
import { LanguageProvider, languageStorageKey } from '../../i18n/language'
import { sr } from '../../i18n/sr'

const originalScroll = HTMLElement.prototype.scrollIntoView

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn()
  localStorage.setItem(languageStorageKey, 'sr')
})

afterEach(() => {
  HTMLElement.prototype.scrollIntoView = originalScroll
  localStorage.removeItem(languageStorageKey)
  vi.useRealTimers()
})

async function openPlayer(live = false) {
  const user = userEvent.setup()
  render(<LanguageProvider><RequestFlow live={live} /></LanguageProvider>)
  const flow = screen.getByRole('region', { name: 'Šta se dogodi kad klikneš?' })
  const button = within(flow).getByRole('button', { name: /Istraži kako funkcioniše/ })
  button.focus()
  await user.keyboard('{Enter}')
  expect(within(flow).getByRole('heading', { name: /Hajde da ispratimo/ })).toHaveFocus()
  await user.click(within(flow).getByRole('button', { name: /Prikaži mi kako/ }))
  expect(within(flow).getByRole('heading', { name: /Kako se sadržaj sajta/ })).toHaveFocus()
  return { user, flow, button }
}

test('opens inline, waits for explicit playback and restores focus after closing', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const { user, flow, button } = await openPlayer(true)
  expect(fetch).not.toHaveBeenCalled()
  expect(within(flow).getByRole('button', { name: 'Sledeći korak' })).toBeDisabled()
  await user.click(within(flow).getByRole('button', { name: 'Zatvori prikaz' }))
  expect(button).toHaveFocus()
  expect(button).toHaveAttribute('aria-expanded', 'false')
  await user.keyboard('{Enter}')
  expect(within(flow).getByRole('heading', { name: /Hajde da ispratimo/ })).toHaveFocus()
})

test('holds each explanation, pauses and navigates manually without calling an API in the guided mode', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const { flow } = await openPlayer()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  const get = within(flow)
  const explanation = get.getByRole('region', { name: 'Šta se trenutno dešava?' })
  function expectPhase(index: number) {
    expect(get.getByText('0' + (index + 1) + ' / 06')).toBeVisible()
    expect(explanation).toHaveTextContent(sr.flow.phases[index].explanation)
  }
  function press(name: string) { fireEvent.click(get.getByRole('button', { name })) }
  press('Prikaži sadržaj')
  const elapsed = steps[0].duration + 200
  await act(() => vi.advanceTimersByTimeAsync(elapsed))
  expectPhase(0)
  press('Pauziraj')
  await act(() => vi.advanceTimersByTimeAsync(phaseReadingTime))
  expectPhase(0)
  press('Pokreni')
  await act(() => vi.advanceTimersByTimeAsync(phaseReadingTime - elapsed))
  expectPhase(1)
  press('Sledeći korak')
  expectPhase(2)
  press('Prethodni korak')
  expectPhase(1)
  press('Ponovi')
  for (const [index, step] of steps.entries()) {
    expectPhase(index)
    await act(() => vi.advanceTimersByTimeAsync(step.duration))
    expectPhase(index)
    await act(() => vi.advanceTimersByTimeAsync(phaseReadingTime - step.duration))
  }
  expectPhase(5)
  expect(get.getByRole('button', { name: 'Pokreni' })).toBeDisabled()
  expect(fetch).not.toHaveBeenCalled()
})

test('localizes known result titles and keeps custom content and the response excerpt in their original form', async () => {
  const response = [
    { key: 'WORK', title: 'Selected Work', body: 'Projects from the server.' },
    { key: 'contact', title: 'Custom contact title', body: 'Example response for the test.' },
  ]
  const fetch = vi.fn().mockResolvedValue(Response.json(response))
  vi.stubGlobal('fetch', fetch)
  const { user, flow } = await openPlayer(true)
  const get = within(flow)
  await user.click(get.getByRole('button', { name: 'Prikaži sadržaj' }))
  expect(fetch).toHaveBeenCalledOnce()
  expect(fetch).toHaveBeenCalledWith('/api/sections', expect.objectContaining({
    headers: { Accept: 'application/json' }, signal: expect.any(AbortSignal),
  }))
  for (let i = 0; i < 3; i++) await user.click(get.getByRole('button', { name: 'Sledeći korak' }))
  expect(get.queryByText('Pogledaj tehničke detalje')).not.toBeInTheDocument()
  expect(get.queryByText('FROM [Sections]', { exact: false })).not.toBeInTheDocument()
  const explanation = get.getByRole('region', { name: 'Šta se trenutno dešava?' })
  expect(explanation).toHaveTextContent(sr.flow.phases[3].explanation)
  await user.click(get.getByRole('button', { name: 'Sledeći korak' }))
  const responseRegion = get.getByRole('region', { name: 'Odgovor servera' })
  expect(responseRegion).toHaveTextContent('HTTP 200 · 2 zapisa')
  expect(responseRegion).toHaveTextContent('"key": "WORK"')
  expect(responseRegion).toHaveTextContent('"title": "Selected Work"')
  expect(explanation).toHaveTextContent(sr.flow.phases[4].explanation)
  await user.click(get.getByRole('button', { name: 'Sledeći korak' }))
  expect(get.getByText('Izdvojeni projekti')).toBeVisible()
  expect(get.getByText('Custom contact title')).toBeVisible()
  expect(get.getByText('Example response for the test.')).toBeVisible()
})

test('reports a failure honestly and ignores an old request after replay or closure', async () => {
  let resolveLate: (value: Response) => void = () => {}
  const fetch = vi.fn()
    .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveLate = resolve }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockImplementationOnce(() => new Promise<Response>(() => {}))
  vi.stubGlobal('fetch', fetch)
  const { user, flow } = await openPlayer(true)
  const get = within(flow)
  await user.click(get.getByRole('button', { name: 'Pokreni' }))
  await user.click(get.getByRole('button', { name: 'Ponovi' }))
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
  await act(async () => resolveLate(Response.json([{ key: 'late', title: 'Old', body: 'Response' }])))
  for (let i = 0; i < 4; i++) await user.click(get.getByRole('button', { name: 'Sledeći korak' }))
  expect(get.getByText(/HTTP 503/)).toBeVisible()
  expect(get.queryByText(/HTTP 200/)).not.toBeInTheDocument()
  expect(get.getByRole('region', { name: 'Šta se trenutno dešava?' })).toHaveTextContent(sr.flow.failedDescription)
  await user.click(get.getByRole('button', { name: 'Sledeći korak' }))
  expect(get.getByRole('heading', { name: 'Učitavanje nije uspelo.' })).toBeVisible()
  await user.click(get.getByRole('button', { name: 'Ponovi' }))
  await user.click(get.getByRole('button', { name: 'Zatvori prikaz' }))
  expect(fetch.mock.calls[2][1].signal.aborted).toBe(true)
})

test('ends a stalled live request at its deadline without relying on AbortSignal.any', async () => {
  const fetch = vi.fn().mockImplementation(() => new Promise<Response>(() => {}))
  vi.stubGlobal('fetch', fetch)
  const { flow } = await openPlayer(true)
  vi.stubGlobal('AbortSignal', undefined)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  const get = within(flow)
  fireEvent.click(get.getByRole('button', { name: 'Prikaži sadržaj' }))
  expect(fetch).toHaveBeenCalledOnce()
  await act(() => vi.advanceTimersByTimeAsync(10000))
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
  for (let i = 0; i < 3; i++) fireEvent.click(get.getByRole('button', { name: 'Sledeći korak' }))
  expect(get.getByRole('region', { name: 'Šta se trenutno dešava?' })).toHaveTextContent(sr.flow.failedDescription)
})
