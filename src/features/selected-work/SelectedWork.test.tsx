import { render, screen, within } from '@testing-library/react'
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

test('places project contribution and case study before the illustrative preview and sample report', () => {
  render(<SelectedWork />)
  const mede = screen.getByRole('article', { name: 'Mede Analytics' })
  const contribution = within(mede).getByRole('list', { name: 'What I built' })
  const caseStudy = within(mede).getByText('Read the case study', { selector: 'summary' })
  const preview = within(mede).getByText('Illustrative reconstruction using synthetic data.')
  const report = within(mede).getByText('Try a sample report', { selector: 'summary' })
  expect(contribution).toHaveTextContent('Report filters and pagination')
  expect(contribution.compareDocumentPosition(caseStudy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(caseStudy.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(caseStudy.compareDocumentPosition(report) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

test('lets readers open a six-part case study and close it again', async () => {
  const user = userEvent.setup()
  render(<SelectedWork />)
  const disclosure = screen.getByText('Read the case study', { selector: 'summary' })
  const details = disclosure.closest('details')
  expect(details).not.toHaveAttribute('open')
  await user.click(disclosure)
  expect(details).toHaveAttribute('open')
  expect(disclosure).toHaveFocus()
  expect(within(details!).getAllByRole('term').map(term => term.textContent)).toEqual([
    'Context', 'My responsibilities', 'Technical approach', 'Implementation', 'Validation', 'User value',
  ])
  expect(screen.getByText(/added and maintained automated tests/)).toBeInTheDocument()
  await user.click(disclosure)
  expect(details).not.toHaveAttribute('open')
})
