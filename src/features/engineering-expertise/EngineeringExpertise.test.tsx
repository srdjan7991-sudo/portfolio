import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { LanguageProvider, useLanguage } from '../../i18n/language'
import { EngineeringExpertise } from './EngineeringExpertise'
import { RequestDemo } from './RequestDemo'

test('opens an area, navigates concepts from the keyboard, and restores focus on return', async () => {
  const user = userEvent.setup()
  render(<EngineeringExpertise />)
  const nav = screen.getByRole('navigation', { name: 'Engineering areas' })
  expect(within(nav).getAllByRole('button')).toHaveLength(5)
  const frontend = within(nav).getByRole('button', { name: /Frontend Engineering/ })
  await user.tab()
  expect(frontend).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('heading', { name: 'Frontend Engineering' })).toHaveFocus()

  const components = await screen.findByRole('tab', { name: 'Component architecture' })
  await user.tab()
  expect(components).toHaveFocus()
  await user.keyboard('{Alt>}{ArrowLeft}{/Alt}')
  expect(components).toHaveFocus()
  await user.keyboard('{ArrowLeft}')
  const performance = screen.getByRole('tab', { name: 'Performance' })
  expect(performance).toHaveFocus()
  expect(performance).toHaveAttribute('aria-selected', 'true')
  const panel = screen.getByRole('tabpanel', { name: 'Performance' })
  expect(within(panel).getByRole('status')).toHaveTextContent('Page 1 of 4')
  within(panel).getByRole('button', { name: 'Next page' }).focus()
  await user.keyboard('{Enter}')
  expect(within(panel).getByRole('status')).toHaveTextContent('Page 2 of 4')
  expect(within(panel).getByText('Result 5')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'All areas' }))
  expect(frontend).toHaveFocus()
  expect(screen.queryByRole('tabpanel')).toBeNull()
})

test('keeps chart selection and aggregation synchronized with the period and concept', async () => {
  const user = userEvent.setup()
  render(<EngineeringExpertise />)
  await user.click(screen.getByRole('button', { name: /Data Visualization/ }))
  await user.click(await screen.findByRole('tab', { name: 'Filtering and aggregation' }))
  expect(screen.getByText('157.5 ms')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Week 2: 134 ms/ }))
  expect(screen.getByRole('status')).toHaveTextContent('-34 ms vs. previous week')
  await user.click(screen.getByRole('button', { name: '3 weeks' }))
  const plot = screen.getByRole('group', { name: 'Sample response times' })
  expect(within(plot).getAllByRole('button')).toHaveLength(3)
  expect(screen.getByText('153.7 ms')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Chart interactions' }))
  expect(screen.getByRole('button', { name: '3 weeks' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('status')).toHaveTextContent('Week 6')
})

test('shows simulated request failure and recovery and discards an unfinished request on exit', async () => {
  const user = userEvent.setup()
  render(<EngineeringExpertise />)
  const integration = screen.getByRole('button', { name: /API Integration/ })
  await user.click(integration)
  const failure = await screen.findByRole('button', { name: 'Simulate error' })
  await user.click(failure)
  expect(screen.getByRole('status')).toHaveTextContent('Waiting for a response')
  expect(await screen.findByText('Request failed')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Simulate success' }))
  expect(await screen.findByText('Request succeeded')).toBeInTheDocument()
  await user.click(failure)
  await user.click(screen.getByRole('button', { name: 'All areas' }))
  await user.click(integration)
  expect(screen.getByRole('status')).toHaveTextContent('Ready to send')
})

test('reset cancels a pending response and the next request keeps its own deadline', () => {
  vi.useFakeTimers()
  try {
    const { unmount } = render(<RequestDemo />)
    fireEvent.click(screen.getByRole('button', { name: 'Simulate error' }))
    act(() => vi.advanceTimersByTime(400))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(vi.getTimerCount()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Simulate success' }))
    act(() => vi.advanceTimersByTime(350))
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for a response')
    act(() => vi.advanceTimersByTime(400))
    expect(screen.getByRole('status')).toHaveTextContent('Request succeeded')

    fireEvent.click(screen.getByRole('button', { name: 'Simulate error' }))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    vi.useRealTimers()
  }
})

test('shows the component test and catches an introduced regression in the quantity rule', async () => {
  const user = userEvent.setup()
  render(<EngineeringExpertise />)
  await user.click(screen.getByRole('button', { name: /Testing & Quality/ }))
  await user.click(screen.getByRole('button', { name: 'Tests' }))
  expect(screen.getByText(/user\.click\(add\)/)).toBeInTheDocument()
  const run = screen.getByRole('button', { name: 'Run checks' })
  await user.click(run)
  expect(screen.getAllByText('Passed')).toHaveLength(2)
  await user.click(screen.getByRole('checkbox', { name: 'Remove the quantity limit' }))
  await user.click(run)
  expect(screen.getByText('Passed')).toBeInTheDocument()
  expect(screen.getByText('Failed')).toBeInTheDocument()
  expect(screen.getByText('Expected 3 · Actual 4')).toBeInTheDocument()
})

function LanguageControl() {
  const { setLanguage } = useLanguage()
  return <button type="button" onClick={() => setLanguage('sr')}>Serbian</button>
}

test('translates the open area without losing concept selection or demo state', async () => {
  const user = userEvent.setup()
  try {
    render(<LanguageProvider><LanguageControl /><EngineeringExpertise /></LanguageProvider>)
    await user.click(screen.getByRole('button', { name: /Frontend Engineering/ }))
    await user.click(await screen.findByRole('tab', { name: 'State management' }))
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.queryByText('Keyboard navigation')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Serbian' }))
    expect(screen.getByRole('heading', { name: 'Kako razvijam softver' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Upravljanje stanjem' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Otvorene' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Kontrast boja')).toBeInTheDocument()
    expect(screen.queryByText('Navigacija tastaturom')).toBeNull()
  } finally {
    localStorage.clear()
    document.documentElement.lang = 'en'
    document.title = ''
  }
})
