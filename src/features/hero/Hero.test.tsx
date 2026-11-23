import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'
import { LanguageProvider, languageStorageKey } from '../../i18n/language'
import { Hero } from './Hero'

test('introduces the author and points both calls to action at their sections', () => {
  render(<Hero />)
  expect(screen.getByRole('heading', { level: 1, name: 'Frontend-focused Software Engineer' })).toBeInTheDocument()
  expect(screen.getByText(/over five years of professional experience/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'View selected work' })).toHaveAttribute('href', '#work')
  expect(screen.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '#contact')
})

test('updates the same semantic heading and calls to action when switching language', async () => {
  const user = userEvent.setup()
  const originalLang = document.documentElement.lang
  const originalTitle = document.title
  localStorage.removeItem(languageStorageKey)
  try {
    render(<LanguageProvider><LanguageSwitch /><Hero /></LanguageProvider>)
    const heading = screen.getByRole('heading', { level: 1, name: 'Frontend-focused Software Engineer' })
    await user.click(screen.getByRole('switch', { name: /EN \/ SR/ }))

    expect(screen.getByRole('heading', { level: 1, name: 'Softverski inženjer za frontend' })).toBe(heading)
    expect(screen.getByRole('region', { name: 'Softverski inženjer za frontend' })).toContainElement(heading)
    expect(screen.getByRole('link', { name: 'Pogledaj projekte' })).toHaveAttribute('href', '#work')
    expect(screen.getByRole('link', { name: 'Javi se' })).toHaveAttribute('href', '#contact')
  } finally {
    localStorage.removeItem(languageStorageKey)
    document.documentElement.lang = originalLang
    document.title = originalTitle
  }
})
