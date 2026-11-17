import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ProfessionalExperience } from './ProfessionalExperience'

test('distinguishes employment from project assignments and associates each project with its dates', () => {
  render(<ProfessionalExperience />)
  expect(screen.getByRole('heading', { name: 'Frontend Developer · Midenas DOO' })).toBeInTheDocument()
  expect(screen.getByText('September 2020 – Present')).toBeInTheDocument()

  for (const [name, period, role] of [
    ['Mede Analytics', '2024–2026', 'Frontend Developer'],
    ['Kterio', '2022–2024', 'Full Stack Developer'],
    ['Alpha Data Solutions', '2020–2022', 'Full Stack Developer'],
  ]) {
    const item = screen.getByRole('heading', { name, level: 4 }).closest('li')!
    expect(within(item).getByText(period)).toBeInTheDocument()
    expect(within(item).getByText(role)).toBeInTheDocument()
  }
})
