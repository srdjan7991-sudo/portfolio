import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { App } from '../App'
import { languageStorageKey } from './language'

const originalScroll = HTMLElement.prototype.scrollIntoView
const originalTitle = document.title
const originalLang = document.documentElement.lang
let description: HTMLMetaElement

beforeEach(() => {
  vi.stubGlobal('location', new URL('http://localhost/'))
  HTMLElement.prototype.scrollIntoView = vi.fn()
  description = document.createElement('meta')
  description.name = 'description'
  document.head.append(description)
})

afterEach(() => {
  HTMLElement.prototype.scrollIntoView = originalScroll
  localStorage.removeItem(languageStorageKey)
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.lang = originalLang
  document.title = originalTitle
  description.remove()
})

test.each([null, 'unknown'])('starts in English with saved preference %s', saved => {
  if (saved) localStorage.setItem(languageStorageKey, saved)
  render(<App />)
  expect(document.documentElement).toHaveAttribute('lang', 'en')
  expect(document.title).toBe('Srdjan Pajic | Frontend Engineer')
  expect(description.content).toMatch(/Explore selected work/)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Frontend-focused Software Engineer')
  expect(screen.getByRole('switch', { name: 'EN / SR, Serbian language' })).toHaveAttribute('aria-checked', 'false')
})

test('switches by keyboard, preserves a case study and theme, and restores the saved language after remount', async () => {
  const user = userEvent.setup()
  const initial = render(<App />)
  const study = screen.getByText('Read the case study', { selector: 'summary' })
  await user.click(study)
  expect(study.parentElement).toHaveAttribute('open')
  await user.click(screen.getByRole('switch', { name: 'Dark theme' }))

  const language = screen.getByRole('switch', { name: 'EN / SR, Serbian language' })
  language.focus()
  await user.keyboard(' ')
  expect(language).toHaveFocus()
  expect(language).toHaveAccessibleName('EN / SR, srpski jezik')
  expect(language).toHaveAttribute('aria-checked', 'true')
  expect(document.documentElement).toHaveAttribute('lang', 'sr')
  expect(document.title).toContain('Softverski inženjer')
  expect(description.content).toMatch(/Pogledajte projekte/)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(study).toHaveTextContent('Pročitaj o projektu')
  expect(study.parentElement).toHaveAttribute('open')
  for (const name of ['Izdvojeni projekti', 'Tehničke veštine', 'Kako razvijam softver', 'Radno iskustvo', 'Obrazovanje i sertifikati', 'Kontakt']) {
    expect(screen.getByRole('heading', { name, level: 2 })).toBeInTheDocument()
  }
  expect(within(screen.getByRole('navigation', { name: 'Glavna navigacija' }))
    .getByRole('link', { name: 'Projekti' })).toHaveAttribute('href', '#work')
  expect(screen.getByRole('link', { name: 'E-pošta' })).toHaveAttribute('href', expect.stringMatching(/^mailto:/))
  expect(screen.getByRole('link', { name: 'Preuzmi CV (engleski, DOCX)' })).toHaveAttribute('download')
  expect(screen.getByRole('link', { name: 'Nazad na vrh' })).toBeInTheDocument()

  initial.unmount()
  render(<App />)
  expect(document.documentElement).toHaveAttribute('lang', 'sr')
  await user.click(screen.getByRole('switch', { name: 'EN / SR, srpski jezik' }))
  expect(screen.getByRole('heading', { name: 'Selected Work' })).toBeInTheDocument()
  expect(screen.getByRole('switch', { name: 'Dark theme' })).toHaveAttribute('aria-checked', 'true')
  expect(localStorage.getItem(languageStorageKey)).toBe('en')
})

test('relabels an open walkthrough without losing its paused stage', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Explore the request' }))
  await user.click(screen.getByRole('button', { name: 'Load content' }))
  await user.click(screen.getByRole('button', { name: 'Next step' }))
  expect(screen.getByText('02 / 06')).toBeVisible()
  const playerTitle = screen.getByRole('heading', { name: 'How does the page load its content?' })
  await user.click(screen.getByRole('switch', { name: 'EN / SR, Serbian language' }))
  expect(playerTitle).toHaveAccessibleName('Kako se sadržaj sajta učitava?')
  expect(screen.getByText('02 / 06')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Zahtev je na putu.' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Pokreni' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Sledeći korak' }))
  expect(screen.getByText('03 / 06')).toBeVisible()
})

test('keeps the menu open when switching languages and dismisses it on Escape or leaving the header', async () => {
  const user = userEvent.setup()
  render(<App />)
  const menu = screen.getByRole('button', { name: 'Menu' })
  const language = screen.getByRole('switch', { name: 'EN / SR, Serbian language' })
  await user.click(menu)
  await user.click(language)
  expect(language).toHaveFocus()
  expect(menu).toHaveAccessibleName('Meni')
  expect(menu).toHaveAttribute('aria-expanded', 'true')
  await user.keyboard('{Escape}')
  expect(menu).toHaveFocus()
  expect(menu).toHaveAttribute('aria-expanded', 'false')

  await user.keyboard('{Enter}')
  language.focus()
  await user.tab()
  expect(screen.getByRole('link', { name: 'Pogledaj projekte' })).toHaveFocus()
  expect(menu).toHaveAttribute('aria-expanded', 'false')
})
