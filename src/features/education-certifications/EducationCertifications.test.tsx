import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { EducationCertifications } from './EducationCertifications'

test('lists the certification and courses with their providers and dates', () => {
  render(<EducationCertifications />)
  const [certification, courses] = screen.getAllByRole('listitem')
  expect(within(certification).getByRole('heading', { name: 'Certified Software Engineering Professional' })).toBeInTheDocument()
  expect(within(certification).getByText('ITAcademy · Belgrade, Serbia · 2018')).toBeInTheDocument()
  expect(within(courses).getByRole('heading', { name: 'Selected Anthropic courses' })).toBeInTheDocument()
  expect(within(courses).getByText(/Claude Code in Action, AI Fluency for Builders, and Introduction to Model Context Protocol · August 2026/)).toBeInTheDocument()
})
