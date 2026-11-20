import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import { LanguageProvider, languageStorageKey } from '../../i18n/language'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'
import { SelectedWork } from './SelectedWork'

afterEach(() => localStorage.removeItem(languageStorageKey))

test('opens from Selected Work and updates table and statistics together', async () => {
  const user = userEvent.setup()
  render(<SelectedWork />)
  const disclosure = screen.getByText('Try a sample report', { selector: 'summary' })
  expect(screen.queryByRole('table', { name: 'Monthly data' })).not.toBeInTheDocument()
  await user.click(disclosure)

  const table = await screen.findByRole('table', { name: 'Monthly data' })
  expect(disclosure).toHaveFocus()
  expect(screen.getByText(/Independent portfolio demo/)).toBeVisible()
  expect(within(table).getAllByRole('row')).toHaveLength(7)
  expect(within(table).getByRole('row', { name: /January 120 \(partial\)/ })).toBeVisible()
  expect(screen.getByText(/Some categories have no data/)).toBeVisible()
  expect(screen.getByText('1,076', { selector: 'dd' })).toBeVisible()

  await user.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), 'secondQuarter')
  const category = screen.getByRole('combobox', { name: 'Report category' })
  await user.selectOptions(category, 'operations')

  expect(category).toHaveFocus()
  expect(within(table).getAllByRole('columnheader')).toHaveLength(2)
  expect(within(table).getAllByRole('rowheader').map(cell => cell.textContent)).toEqual(['April', 'May', 'June'])
  expect(within(table).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['24', '28', '30'])
  expect(screen.getByText('82', { selector: 'dd' })).toBeVisible()
  expect(screen.getByText('27.3', { selector: 'dd' })).toBeVisible()
  expect(screen.getByText('Completed reports by month')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('82 completed reports. 3 of 3 months have data.')

  await user.click(disclosure)
  await user.click(disclosure)
  expect(category).toHaveValue('operations')
  expect(table).toBeVisible()
})

test('shows missing months, then an empty result, and resets both filters in place', async () => {
  const user = userEvent.setup()
  render(<SelectedWork />)
  await user.click(screen.getByText('Try a sample report', { selector: 'summary' }))
  const category = await screen.findByRole('combobox', { name: 'Report category' })
  const period = screen.getByRole('combobox', { name: 'Reporting period' })
  const chart = screen.getByText('Completed reports by month').closest('figure')
  const firstBar = chart?.querySelector('span[style]')
  expect(firstBar).toHaveStyle({ height: '50%' })

  await user.selectOptions(category, 'operations')
  const table = screen.getByRole('table', { name: 'Monthly data' })
  expect(chart?.querySelector('span[style]')).toBe(firstBar)
  expect(firstBar).toHaveStyle({ height: '0%' })
  expect(within(table).getAllByRole('cell', { name: 'No data' })).toHaveLength(3)
  expect(screen.getByText('A dash indicates a month with no data.')).toBeVisible()
  expect(screen.getByText('3 of 6')).toBeVisible()

  await user.selectOptions(period, 'firstQuarter')
  expect(screen.getByRole('status')).toHaveTextContent('No results for these filters. Try another period or category')
  expect(screen.queryByRole('table', { name: 'Monthly data' })).not.toBeInTheDocument()
  expect(screen.queryAllByRole('figure')).not.toContain(chart)
  expect(screen.queryByText('27.3')).not.toBeInTheDocument()

  const reset = screen.getByRole('button', { name: 'Reset filters' })
  await user.click(reset)
  expect(reset).toHaveFocus()
  expect(period).toHaveValue('firstHalf')
  expect(category).toHaveValue('all')
  expect(screen.getByRole('table', { name: 'Monthly data' })).toBeVisible()
  expect(screen.getByText('Completed reports by month').closest('figure')).toBe(chart)
  expect(chart?.querySelector('span[style]')).toBe(firstBar)
  expect(firstBar).toHaveStyle({ height: '50%' })
  expect(screen.getByRole('status')).toHaveTextContent('1,076 completed reports.')
})

test('localizes the open report without changing either filter', async () => {
  const user = userEvent.setup()
  render(<LanguageProvider><LanguageSwitch /><SelectedWork /></LanguageProvider>)
  await user.click(screen.getByText('Try a sample report', { selector: 'summary' }))
  const period = await screen.findByRole('combobox', { name: 'Reporting period' })
  const category = screen.getByRole('combobox', { name: 'Report category' })
  await user.selectOptions(period, 'secondQuarter')
  await user.selectOptions(category, 'operations')
  await user.click(screen.getByRole('switch', { name: /Serbian language/ }))

  expect(screen.getByRole('combobox', { name: 'Period izveštaja' })).toHaveValue('secondQuarter')
  expect(screen.getByRole('combobox', { name: 'Kategorija izveštaja' })).toHaveValue('operations')
  expect(screen.getByText('Interaktivni primer analitičkog izveštaja')).toBeVisible()
  expect(screen.getByText('27,3', { selector: 'dd' })).toBeVisible()
  const table = screen.getByRole('table', { name: 'Mesečni podaci' })
  expect(within(table).getAllByRole('rowheader').map(cell => cell.textContent)).toEqual(['april', 'maj', 'jun'])
})
