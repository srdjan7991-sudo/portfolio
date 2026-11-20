import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Contact } from './Contact'

test('uses the default mail handler for the email link', () => {
  render(<Contact />)
  const email = screen.getByRole('link', { name: 'Email' })
  expect(email).toHaveAttribute('href', 'mailto:srdjan.7991@gmail.com')
  expect(email).not.toHaveAttribute('target')
})

test.each([
  ['LinkedIn', 'https://www.linkedin.com/in/srdjan-pajic-6a8911281/'],
  ['GitHub', 'https://github.com/srdjan7991-sudo'],
])('opens %s in a new tab without an opener or referrer', (name, href) => {
  render(<Contact />)
  const profile = screen.getByRole('link', { name })
  expect(profile).toHaveAttribute('href', href)
  expect(profile).toHaveAttribute('target', '_blank')
  expect(profile).toHaveAttribute('rel', 'noopener noreferrer')
})

test('offers the DOCX CV as a download under the configured base URL', () => {
  render(<Contact />)
  const cv = screen.getByRole('link', { name: 'Download CV (English, DOCX)' })
  expect(cv).toHaveAttribute('href', `${import.meta.env.BASE_URL}Srdjan_Pajic_CV.docx`)
  expect(cv).toHaveAttribute('download')
})
