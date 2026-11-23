import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { LanguageProvider, languageStorageKey } from '../../../i18n/language'
import { LanguageSwitch } from '../../../i18n/LanguageSwitch'
import { RequestFlow } from '../RequestFlow'

const scrollIntoView = HTMLElement.prototype.scrollIntoView

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn()
  localStorage.setItem(languageStorageKey, 'en')
})

afterEach(() => {
  HTMLElement.prototype.scrollIntoView = scrollIntoView
  localStorage.removeItem(languageStorageKey)
  vi.useRealTimers()
})

function openScenarios(live = false) {
  render(<LanguageProvider><LanguageSwitch /><RequestFlow live={live} /></LanguageProvider>)
  const opener = screen.getByRole('button', { name: 'Try HTTP scenarios' })
  fireEvent.click(opener)
  const region = screen.getByRole('region', { name: 'When requests don’t go to plan' })
  const demo = within(region)
  return {
    opener, demo, region,
    button: (name: string) => demo.getByRole('button', { name }),
    press: (name: string) => fireEvent.click(demo.getByRole('button', { name })),
    select: (name: string) => fireEvent.click(demo.getByRole('radio', { name })),
    lane: (index: number) => demo.getAllByRole('listitem')[index],
  }
}

async function tick(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}

async function completeFastRequest() {
  await tick(650)
  await tick(750)
  await tick(650)
}

function useClock() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
}

test('shows both outcomes when a newer response arrives before the older one without making HTTP calls', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const { button, press, demo, lane } = openScenarios(true)
  useClock()

  expect(button('Send newer request')).toHaveAttribute('aria-disabled', 'true')
  press('Send newer request')
  expect(lane(1)).toHaveTextContent('Not sent')
  press('Send request')
  press('Send request')
  expect(lane(0)).toHaveTextContent('Sending request')
  expect(lane(1)).toHaveTextContent('Not sent')
  await tick(650)
  await tick(12000)
  expect(lane(0)).toHaveTextContent('Server is processing')

  press('Send newer request')
  expect(lane(0)).toHaveTextContent('Server is processing')
  expect(lane(1)).toHaveTextContent('Sending request')
  await completeFastRequest()
  expect(demo.getAllByText('Last 30 days')).toHaveLength(2)
  expect(demo.getByRole('status')).toHaveTextContent('The newer response arrived first')
  await tick(800)
  expect(lane(0)).toHaveTextContent('Response on its way')
  await tick(650)
  expect(lane(0)).toHaveTextContent('HTTP 200')
  const unchecked = demo.getByText('Without a response check').closest('div')
  const checked = demo.getByText('With a response check').closest('div')
  expect(unchecked).toHaveTextContent('Last 7 days')
  expect(unchecked).toHaveTextContent('Stale result')
  expect(checked).toHaveTextContent('Last 30 days')
  expect(checked).toHaveTextContent('Current selection')
  expect(demo.getByRole('status')).toHaveTextContent('The older response arrived last')
  expect(fetch).not.toHaveBeenCalled()
})

test('keeps later phases visible after the browser delivers a timer late', async () => {
  const { press, demo, lane } = openScenarios()
  useClock()
  const now = performance.now.bind(performance)
  let delay = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now() + delay)
  press('Send request')
  press('Send newer request')
  delay = 5000

  await tick(650)
  expect(lane(1)).toHaveTextContent('Server is processing')
  await tick(100)
  expect(lane(1)).toHaveTextContent('Server is processing')
  await tick(650)
  expect(lane(1)).toHaveTextContent('Response on its way')
  await tick(650)
  expect(demo.getAllByText('Last 30 days')).toHaveLength(2)
  await tick(799)
  expect(lane(0)).toHaveTextContent('Server is processing')
  await tick(1)
  expect(lane(0)).toHaveTextContent('Response on its way')
})

test('cancels a slow request during server processing and accepts a replacement', async () => {
  const { select, press, lane, demo } = openScenarios()
  select('Cancel a slow request')
  useClock()
  press('Send request')
  await tick(650)
  expect(lane(0)).toHaveTextContent('Server is processing')
  press('Cancel request')
  expect(lane(0)).toHaveTextContent('Cancelled')
  await tick(12000)
  expect(lane(0)).not.toHaveTextContent('HTTP 200')
  expect(demo.getByRole('status')).toHaveTextContent('The browser stopped waiting')

  press('Send replacement')
  await completeFastRequest()
  expect(lane(0)).toHaveTextContent('Cancelled')
  expect(lane(1)).toHaveTextContent('HTTP 200')
  expect(demo.getByText('Report ready')).toBeVisible()
})

test('issuing a replacement cancels the pending request even before its outbound transit ends', async () => {
  const { select, press, lane, button } = openScenarios()
  select('Cancel a slow request')
  useClock()
  press('Send request')
  press('Send replacement')
  expect(lane(0)).toHaveTextContent('Cancelled')
  expect(lane(1)).toHaveTextContent('Sending request')
  expect(button('Send replacement')).toHaveAttribute('aria-disabled', 'true')
  await completeFastRequest()
  await tick(12000)
  expect(lane(0)).toHaveTextContent('Cancelled')
  expect(lane(1)).toHaveTextContent('HTTP 200')
})

test('cancellation still works while the response is on its way', async () => {
  const { select, press, lane, demo } = openScenarios()
  select('Cancel a slow request')
  useClock()
  press('Send request')
  await tick(650)
  await tick(4700)
  expect(lane(0)).toHaveTextContent('Response on its way')
  press('Cancel request')
  await tick(650)
  expect(lane(0)).toHaveTextContent('Cancelled')
  expect(demo.queryByText('Report ready')).not.toBeInTheDocument()
})

test('retry is available after the 500 arrives and preserves the failed attempt', async () => {
  const { select, press, button, lane, demo } = openScenarios()
  select('Recover from HTTP 500')
  useClock()
  press('Send request')
  expect(demo.getByText('Loading the report…')).toBeVisible()
  await tick(650)
  await tick(750)
  expect(lane(0)).toHaveTextContent('Response on its way')
  expect(button('Retry request')).toHaveAttribute('aria-disabled', 'true')
  press('Retry request')
  expect(lane(1)).toHaveTextContent('Not sent')
  await tick(650)
  expect(lane(0)).toHaveTextContent('HTTP 500')
  expect(button('Retry request')).toHaveAttribute('aria-disabled', 'false')
  press('Retry request')
  expect(demo.getByText('Loading the report…')).toBeVisible()
  await completeFastRequest()
  expect(lane(0)).toHaveTextContent('HTTP 500')
  expect(lane(1)).toHaveTextContent('HTTP 200')
  expect(demo.getByText('Report ready')).toBeVisible()
})

test('reset, changing scenarios and closing discard unfinished runs', async () => {
  const { select, press, lane, opener } = openScenarios()
  useClock()
  press('Send request')
  press('Send newer request')
  press('Reset')
  await tick(12000)
  expect(lane(0)).toHaveTextContent('Not sent')
  press('Send request')
  select('Recover from HTTP 500')
  await tick(12000)
  expect(lane(0)).toHaveTextContent('Not sent')
  press('Send request')
  await tick(650)
  const hiddenLane = lane(0)
  fireEvent.click(screen.getByRole('button', { name: 'Close HTTP scenarios' }))
  expect(opener).toHaveFocus()
  await tick(12000)
  expect(hiddenLane).toHaveTextContent('Server is processing')
  fireEvent.click(opener)
  expect(screen.getByRole('radio', { name: 'Responses out of order' })).toBeChecked()
  await tick(12000)
  expect(screen.getAllByText('Not sent')).toHaveLength(2)
})

test('focus enters the simulator, native radios support arrow keys, and translation preserves the run', async () => {
  const { demo, press } = openScenarios()
  expect(demo.getByRole('heading', { name: 'When requests don’t go to plan' })).toHaveFocus()
  const user = userEvent.setup()
  await user.tab()
  expect(demo.getByRole('radio', { name: 'Responses out of order' })).toHaveFocus()
  await user.keyboard('{ArrowRight}')
  expect(demo.getByRole('radio', { name: 'Cancel a slow request' })).toBeChecked()

  press('Send request')
  await user.click(screen.getByRole('switch', { name: 'EN / SR, Serbian language' }))
  const translated = within(screen.getByRole('region', { name: 'Kada zahtevi ne idu po planu' }))
  expect(translated.getByRole('radio', { name: 'Otkaži spor zahtev' })).toBeChecked()
  expect(translated.getByRole('button', { name: 'Otkaži zahtev' })).toHaveAttribute('aria-disabled', 'false')
})
