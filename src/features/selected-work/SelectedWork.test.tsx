import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { SelectedWork } from './SelectedWork'

test('shows both projects and identifies the dashboard preview as synthetic', () => {
  render(<SelectedWork />)
  for (const name of ['Mede Analytics', 'Kterio']) {
    expect(screen.getByRole('heading', { name, level: 3 })).toBeInTheDocument()
  }
  expect(screen.getByText('Illustrative reconstruction using synthetic data.')).toBeInTheDocument()
  expect(screen.getByRole('article', { name: 'Mede Analytics' })).toHaveAttribute('id', 'work-mede')
  expect(screen.getByRole('article', { name: 'Kterio' })).toHaveAttribute('id', 'work-kterio')
})

test('lets readers open and close the case study', async () => {
  const user = userEvent.setup()
  render(<SelectedWork />)
  const disclosure = screen.getByText('Read the case study', { selector: 'summary' })
  const details = disclosure.closest('details')
  expect(details).not.toHaveAttribute('open')
  await user.click(disclosure)
  expect(details).toHaveAttribute('open')
  expect(disclosure).toHaveFocus()
  expect(screen.getByText(/added and maintained automated tests/)).toBeInTheDocument()
  await user.click(disclosure)
  expect(details).not.toHaveAttribute('open')
})
