import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Contact } from './Contact'

test('links to the public contact channels', () => {
  render(<Contact />)
  expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:srdjan.7991@gmail.com')
  expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/srdjan-pajic-6a8911281/')
  expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/srdjan7991-sudo')
})

test('offers the DOCX CV as a download under the configured base URL', () => {
  render(<Contact />)
  const cv = screen.getByRole('link', { name: 'Download CV (DOCX)' })
  expect(cv).toHaveAttribute('href', `${import.meta.env.BASE_URL}Srdjan_Pajic_CV.docx`)
  expect(cv).toHaveAttribute('download')
})
