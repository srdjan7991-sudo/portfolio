import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ThemeSwitch } from './ThemeSwitch'
import { useTheme } from './useTheme'

const root = document.documentElement
const storageKey = 'portfolio-theme'
let themeColor: HTMLMetaElement

function ThemeControl() {
  const { theme, toggleTheme } = useTheme()
  return <ThemeSwitch theme={theme} onToggle={toggleTheme} />
}

beforeEach(() => {
  root.dataset.theme = 'light'
  root.dataset.themeStorage = storageKey
  themeColor = document.createElement('meta')
  themeColor.name = 'theme-color'
  themeColor.dataset.light = '#f4f2ed'
  themeColor.dataset.dark = '#242628'
  themeColor.content = themeColor.dataset.light
  document.head.append(themeColor)
})

afterEach(() => {
  delete root.dataset.theme
  delete root.dataset.themeStorage
  localStorage.removeItem(storageKey)
  themeColor.remove()
})

test('switches both ways with the keyboard, keeps focus and persists the choice', async () => {
  const user = userEvent.setup()
  render(<ThemeControl />)
  const control = screen.getByRole('switch', { name: 'Dark theme' })

  await user.tab()
  expect(control).toHaveFocus()
  expect(control).not.toBeChecked()
  await user.keyboard(' ')
  expect(control).toBeChecked()
  expect(root).toHaveAttribute('data-theme', 'dark')
  expect(themeColor.content).toBe(themeColor.dataset.dark)
  expect(localStorage.getItem(storageKey)).toBe('dark')

  await user.keyboard('{Enter}')
  expect(control).not.toBeChecked()
  expect(control).toHaveFocus()
  expect(root).toHaveAttribute('data-theme', 'light')
  expect(themeColor.content).toBe(themeColor.dataset.light)
  expect(localStorage.getItem(storageKey)).toBe('light')
})

test('uses the page theme already applied by the document bootstrap', () => {
  root.dataset.theme = 'dark'
  themeColor.content = themeColor.dataset.dark!
  localStorage.setItem(storageKey, 'dark')
  const write = vi.spyOn(Storage.prototype, 'setItem')

  render(<ThemeControl />)

  expect(screen.getByRole('switch', { name: 'Dark theme' })).toBeChecked()
  expect(root).toHaveAttribute('data-theme', 'dark')
  expect(write).not.toHaveBeenCalled()
})

test('continues to switch themes in the current page when storage is blocked', async () => {
  const user = userEvent.setup()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage is disabled') })
  render(<ThemeControl />)

  await user.click(screen.getByRole('switch', { name: 'Dark theme' }))

  expect(screen.getByRole('switch', { name: 'Dark theme' })).toBeChecked()
  expect(root).toHaveAttribute('data-theme', 'dark')
})
