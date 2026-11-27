import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { ProfessionalExperience } from './ProfessionalExperience'

test('distinguishes employment from project assignments and associates each project with its dates', () => {
  render(<ProfessionalExperience />)
  expect(screen.getByRole('heading', { name: 'Frontend Developer · Midenas DOO' })).toBeInTheDocument()
  expect(screen.getByText('September 2020 – Present')).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 4 }).map(heading => heading.textContent))
    .toEqual(['Mede Analytics', 'Kterio', 'Alpha Data Solutions'])

  for (const [id, name, period, role] of [
    ['experience-mede', 'Mede Analytics', '2024–2026', 'Frontend Developer'],
    ['experience-kterio', 'Kterio', '2022–2024', 'Full Stack Developer'],
    ['experience-alpha', 'Alpha Data Solutions', '2020–2022', 'Full Stack Developer'],
  ]) {
    const heading = screen.getByRole('heading', { name, level: 4 })
    expect(heading).toHaveAttribute('id', id)
    expect(heading).toHaveAttribute('tabindex', '-1')
    const item = heading.closest('li')!
    expect(within(item).getByText(period)).toBeInTheDocument()
    expect(within(item).getByText(role)).toBeInTheDocument()
  }
})

test('expands only projects with existing details without removing their summary', async () => {
  const user = userEvent.setup()
  render(<ProfessionalExperience />)
  const mede = screen.getByRole('heading', { name: 'Mede Analytics' }).closest('li')!
  const details = within(mede).getByRole('button', { name: 'Details for Mede Analytics' })
  const panel = document.getElementById(details.getAttribute('aria-controls')!)!
  expect(details).toHaveAttribute('aria-expanded', 'false')
  expect(panel).toHaveAttribute('inert')

  details.focus()
  await user.keyboard('{Enter}')
  expect(details).toHaveAttribute('aria-expanded', 'true')
  expect(panel).not.toHaveAttribute('inert')
  expect(within(panel).getByText(/I worked with backend developers/)).toBeInTheDocument()
  expect(within(mede).getByText(/My frontend assignment covered reporting workflows/)).toBeVisible()
  await user.keyboard(' ')
  expect(details).toHaveAttribute('aria-expanded', 'false')
  expect(details).toHaveFocus()
  const kterio = screen.getByRole('heading', { name: 'Kterio' }).closest('li')!
  const kterioDetails = within(kterio).getByRole('button', { name: 'Details for Kterio' })
  await user.click(kterioDetails)
  expect(kterioDetails).toHaveAttribute('aria-expanded', 'true')
  expect(within(kterio).getByText(/I used Entity Framework Core to access and manage data in PostgreSQL/)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Details for Alpha Data Solutions' })).toBeNull()
})

test('links technologies to documented skill entries and keeps unmatched tools as text', () => {
  render(<ProfessionalExperience />)
  const alpha = screen.getByRole('heading', { name: 'Alpha Data Solutions' }).closest('li')!
  expect(within(alpha).getByRole('link', { name: 'C#' })).toHaveAttribute('href', '#skill-c-sharp')
  expect(within(alpha).getByRole('link', { name: '.NET 5' })).toHaveAttribute('href', '#skill-dotnet')
  expect(within(alpha).getByRole('link', { name: 'EF Core' })).toHaveAttribute('href', '#skill-entity-framework-core')
  expect(within(alpha).getByText('Razor Pages')).toBeInTheDocument()
  expect(within(alpha).queryByRole('link', { name: 'Razor Pages' })).toBeNull()
})

test('keeps all content visible when the entrance observer cannot start', () => {
  const disconnect = vi.fn()
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn().mockImplementationOnce(() => undefined).mockImplementation(() => {
      throw new Error('Cannot observe target')
    })
    disconnect = disconnect
  })

  render(<ProfessionalExperience />)
  for (const title of ['Professional Experience', 'Mede Analytics', 'Kterio', 'Alpha Data Solutions']) {
    expect(screen.getByRole('heading', { name: title })).toBeVisible()
  }
  expect(disconnect).toHaveBeenCalledOnce()
})
