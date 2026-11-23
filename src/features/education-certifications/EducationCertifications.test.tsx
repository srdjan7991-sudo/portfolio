import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { EducationCertifications } from './EducationCertifications'

test('lists the certification and courses with their providers and dates', () => {
  render(<EducationCertifications />)
  const [certification, courses] = screen.getAllByRole('listitem')
  expect(within(certification).getByRole('heading', { name: 'Certified Software Engineering Professional' })).toHaveAttribute('lang', 'en')
  expect(within(certification).getByText('ITAcademy · Belgrade, Serbia')).toBeInTheDocument()
  expect(within(certification).getByText('2018')).toHaveAttribute('datetime', '2018')
  expect(within(courses).getByRole('heading', { name: 'Selected Anthropic courses' })).toBeInTheDocument()
  expect(within(courses).getByText('Claude Code in Action')).toHaveAttribute('lang', 'en')
  expect(courses).toHaveTextContent('Claude Code in Action, AI Fluency for Builders, and Introduction to Model Context Protocol')
  expect(within(courses).getByText('August 2026')).toHaveAttribute('datetime', '2026-08')
})
