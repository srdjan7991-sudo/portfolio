import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
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
    const work = screen.getByRole('link', { name: 'View selected work' })
    const contact = screen.getByRole('link', { name: 'Get in touch' })
    await user.click(screen.getByRole('switch', { name: /EN \/ SR/ }))

    expect(screen.getByRole('heading', { level: 1, name: 'Softverski inženjer za frontend' })).toBe(heading)
    expect(screen.getByRole('region', { name: 'Softverski inženjer za frontend' })).toContainElement(heading)
    expect(screen.getByRole('link', { name: 'Pogledaj projekte' })).toBe(work)
    expect(screen.getByRole('link', { name: 'Javi se' })).toBe(contact)
  } finally {
    localStorage.removeItem(languageStorageKey)
    document.documentElement.lang = originalLang
    document.title = originalTitle
  }
})

test('opens the photograph on actual visibility and finishes permanently when reduced motion is turned on', () => {
  vi.stubGlobal('CSS', { supports: () => true })
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(450)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.matches('.hero-visual') ? new DOMRect(0, 500, 350, 208) : new DOMRect(0, 0, 390, 760)
  })
  const motion = new EventTarget()
  const preference = Object.assign(motion, { matches: false })
  vi.stubGlobal('matchMedia', () => preference)
  let observed: IntersectionObserverCallback | undefined
  const disconnect = vi.fn()
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { observed = callback }
    observe = vi.fn()
    disconnect = disconnect
  })

  const { container } = render(<Hero />)
  const visual = container.querySelector('.hero-visual')
  const entry = (intersectionRatio: number) => ({ isIntersecting: intersectionRatio >= 0, intersectionRatio })
  const notify = (...ratios: number[]) => act(() =>
    observed?.(ratios.map(entry) as IntersectionObserverEntry[], {} as IntersectionObserver))
  expect(visual).toHaveAttribute('data-hero-window', 'waiting')
  notify(0)
  expect(visual).toHaveAttribute('data-hero-window', 'waiting')
  notify(0.2, -1)
  expect(visual).toHaveAttribute('data-hero-window', 'waiting')
  notify(-1, 0.2)
  expect(visual).toHaveAttribute('data-hero-window', 'opening')

  act(() => motion.dispatchEvent(Object.assign(new Event('change'), { matches: true })))
  expect(visual).not.toHaveAttribute('data-hero-window')
  expect(screen.getByRole('region')).not.toHaveAttribute('data-hero-intro')
  expect(disconnect).toHaveBeenCalled()
  act(() => motion.dispatchEvent(Object.assign(new Event('change'), { matches: false })))
  notify(0.8)
  expect(visual).not.toHaveAttribute('data-hero-window')
  expect(screen.getByRole('link', { name: 'View selected work' })).toHaveAttribute('href', '#work')
})
