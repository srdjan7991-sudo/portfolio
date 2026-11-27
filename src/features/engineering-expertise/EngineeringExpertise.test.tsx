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
  const firstWeek = screen.getByRole('button', { name: /Week 1: 168 ms/ })
  firstWeek.focus()
  await user.hover(screen.getByRole('button', { name: /Week 2: 134 ms/ }))
  expect(screen.getByRole('status')).toHaveTextContent('Week 2')
  await user.keyboard(' ')
  expect(firstWeek).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('status')).toHaveTextContent('Week 1')
  await user.click(screen.getByRole('button', { name: /Week 2: 134 ms/ }))
  expect(screen.getByRole('status')).toHaveTextContent('-34 ms vs. previous week')
  await user.click(screen.getByRole('button', { name: '3 weeks' }))
  const plot = screen.getByRole('group', { name: 'Sample response times' })
  expect(within(plot).getAllByRole('button')).toHaveLength(3)
  expect(screen.getByText('153.7 ms')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Chart interactions' }))
  expect(screen.getByRole('tabpanel', { name: 'Chart interactions' })).toHaveTextContent('Focus, hover, or tap a bar')
  expect(screen.getByRole('button', { name: '3 weeks' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('status')).toHaveTextContent('Week 6')
})

test('opens the relevant module when the architecture concept changes by keyboard', async () => {
  const user = userEvent.setup()
  render(<EngineeringExpertise />)
  await user.click(screen.getByRole('button', { name: /Application Architecture/ }))
  const separation = await screen.findByRole('tab', { name: 'Separation of concerns' })
  separation.focus()
  await user.keyboard('{ArrowRight}')
  const modules = screen.getByRole('tabpanel', { name: 'Module boundaries' })
  expect(within(modules).getByRole('button', { name: 'Service' })).toHaveAttribute('aria-pressed', 'true')
  expect(modules.querySelector('pre')).toHaveTextContent('getVisibleReports()')
  await user.keyboard('{End}')
  const modernization = screen.getByRole('tabpanel', { name: 'Legacy modernization' })
  expect(within(modernization).getByRole('button', { name: 'One module' })).toHaveAttribute('aria-pressed', 'true')
  expect(modernization.querySelector('pre')).toHaveTextContent('loadReports()')
})

test('shows the keyboard test and accepts the same keyboard interaction', async () => {
  const user = userEvent.setup()
  render(<EngineeringExpertise />)
  await user.click(screen.getByRole('button', { name: /Testing & Quality/ }))
  await user.click(await screen.findByRole('tab', { name: 'Interaction tests' }))
  const panel = screen.getByRole('tabpanel', { name: 'Interaction tests' })
  expect(panel.querySelector('pre')).toHaveTextContent("user.keyboard('{Enter}{Enter}')")
  within(panel).getByRole('button', { name: 'Add item' }).focus()
  await user.keyboard('{Enter}{Enter}')
  expect(within(panel).getByRole('status')).toHaveTextContent('Quantity 3')
})

test('starts the regression exercise with its test and limit comparison visible', async () => {
  const user = userEvent.setup()
  render(<EngineeringExpertise />)
  await user.click(screen.getByRole('button', { name: /Testing & Quality/ }))
  await user.click(await screen.findByRole('tab', { name: 'Regression prevention' }))
  const panel = screen.getByRole('tabpanel', { name: 'Regression prevention' })
  expect(within(panel).getByRole('button', { name: 'Tests' })).toHaveAttribute('aria-pressed', 'true')
  expect(within(panel).getByRole('region', { name: 'With the limit' })).toBeVisible()
  expect(within(panel).getByRole('region', { name: 'Without the limit' })).toBeVisible()
  await user.click(within(panel).getByRole('checkbox', { name: 'Remove the quantity limit' }))
  await user.click(within(panel).getByRole('button', { name: 'Run checks' }))
  expect(panel).toHaveTextContent('Expected 3 · Actual 4')
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
  const add = screen.getByRole('button', { name: 'Add item' })
  await user.dblClick(add)
  expect(screen.getByRole('status')).toHaveTextContent('Quantity 3')
  const run = screen.getByRole('button', { name: 'Run checks' })
  await user.click(run)
  expect(screen.getAllByText('Passed')).toHaveLength(2)
  await user.click(screen.getByRole('checkbox', { name: 'Remove the quantity limit' }))
  await user.dblClick(add)
  expect(screen.getByRole('status')).toHaveTextContent('Quantity 4')
  await user.click(run)
  expect(screen.getByText('Passed')).toBeInTheDocument()
  expect(screen.getByText('Failed')).toBeInTheDocument()
  expect(screen.getByText('Expected 3 · Actual 4')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Reset quantity' }))
  expect(screen.getByRole('status')).toHaveTextContent('Quantity 2')
})

function LanguageControl() {
  const { setLanguage } = useLanguage()
  return <button type="button" onClick={() => setLanguage('sr')}>Serbian</button>
}

test('compares both rules at the same limit and keeps the open comparison in Serbian', async () => {
  const user = userEvent.setup()
  try {
    render(<LanguageProvider><LanguageControl /><EngineeringExpertise /></LanguageProvider>)
    await user.click(screen.getByRole('button', { name: /Testing & Quality/ }))
    const summary = screen.getByText('Compare both rules')
    const disclosure = summary.closest('details')
    expect(disclosure).not.toHaveAttribute('open')
    await user.click(summary)
    expect(disclosure).toHaveAttribute('open')
    const limited = screen.getByRole('region', { name: 'With the limit' })
    const unlimited = screen.getByRole('region', { name: 'Without the limit' })
    expect(limited).toHaveTextContent('Actual 3')
    expect(unlimited).toHaveTextContent('Actual 4')
    expect(within(limited).getByText('Math.min(quantity + 1, 3)')).toBeVisible()
    expect(within(unlimited).getByText('quantity + 1')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Quantity 2')
    await user.click(screen.getByRole('button', { name: 'Serbian' }))
    expect(screen.getByRole('region', { name: 'Sa ograničenjem' })).toHaveTextContent('Dobijeno 3')
    expect(screen.getByRole('region', { name: 'Bez ograničenja' })).toHaveTextContent('Dobijeno 4')
  } finally {
    localStorage.clear()
    document.documentElement.lang = 'en'
    document.title = ''
  }
})

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
