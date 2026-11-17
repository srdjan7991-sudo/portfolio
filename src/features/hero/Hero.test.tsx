import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Hero } from './Hero'

test('introduces the author and points both calls to action at their sections', () => {
  vi.stubGlobal('matchMedia', (media: string): MediaQueryList => ({
    media,
    matches: false,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  render(<Hero />)
  expect(screen.getByRole('heading', { level: 1, name: 'Frontend-focused Software Engineer' })).toBeInTheDocument()
  expect(screen.getByText(/over five years of professional experience/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'View selected work' })).toHaveAttribute('href', '#work')
  expect(screen.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '#contact')
})
