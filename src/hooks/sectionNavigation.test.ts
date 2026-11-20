import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'
import { App } from '../App'
import { useActiveSection, useSectionNavigation } from './sectionNavigation'
import { defaultSectionOrder } from '../sections'
import { en } from '../i18n/en'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

test('every primary navigation link reaches a named section in the same reading order', () => {
  render(createElement(App))
  const regions = screen.getAllByRole('region')
  const registeredIds = defaultSectionOrder
  expect(regions.map((region) => region.id)).toEqual(['top', 'request-flow', ...registeredIds])
  expect(new Set(registeredIds).size).toBe(registeredIds.length)
  for (const id of registeredIds) {
    expect(screen.getByRole('link', { name: en.sections[id].label })).toHaveAttribute('href', `#${id}`)
  }
})

function renderActiveSection(readTop: Record<string, () => number>) {
  const { container } = render(createElement(
    'main',
    null,
    Object.keys(readTop).map((id) => createElement('section', { id, key: id })),
  ))
  const header = document.createElement('header')
  vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ height: 80 }))
  for (const section of container.querySelectorAll('section')) {
    vi.spyOn(section, 'getBoundingClientRect').mockImplementation(() =>
      DOMRect.fromRect({ y: readTop[section.id]() }),
    )
  }
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(600)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000)
  const headerRef = { current: header }
  return renderHook(() => useActiveSection(headerRef, defaultSectionOrder))
}

async function nextAnimationFrame() {
  await act(async () => {
    await new Promise<number>((resolve) => requestAnimationFrame(resolve))
  })
}

test('tracks the section that crosses the reading line and skips missing sections', async () => {
  let workTop = 350
  let contactTop = 750
  const { result } = renderActiveSection({ work: () => workTop, contact: () => contactTop })
  await nextAnimationFrame()
  expect(result.current).toBeUndefined()

  workTop = 120
  fireEvent.scroll(window)
  await nextAnimationFrame()
  expect(result.current).toBe('work')

  contactTop = 181
  workTop = -300
  fireEvent.scroll(window)
  await nextAnimationFrame()
  expect(result.current).toBe('work')

  contactTop = 179
  fireEvent.scroll(window)
  await nextAnimationFrame()
  expect(result.current).toBe('contact')
})

test('honors a requested section when the scroll position is clamped at the bottom', async () => {
  vi.stubGlobal('scrollY', 1400)
  const { result } = renderActiveSection({ education: () => 240, contact: () => 420 })
  await nextAnimationFrame()
  expect(result.current).toBe('contact')

  window.history.replaceState(null, '', '#education')
  fireEvent(window, new HashChangeEvent('hashchange'))
  await nextAnimationFrame()
  expect(result.current).toBe('education')
})

test.each([
  { scenario: 'the reader stays at the target', scrollY: 0, alignments: 2 },
  { scenario: 'the reader scrolls away', scrollY: 300, alignments: 1 },
])('handles late fonts when $scenario after opening a deep link', async ({ scrollY, alignments }) => {
  window.history.replaceState(null, '', '#work')
  vi.stubGlobal('scrollY', 0)
  render(createElement('section', { id: 'work', tabIndex: -1, 'aria-label': 'Selected Work' }))
  const section = screen.getByRole('region', { name: 'Selected Work' })
  section.scrollIntoView = vi.fn()
  let finishLoadingFonts = () => {}
  const fontsReady = new Promise<void>((resolve) => { finishLoadingFonts = resolve })
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: fontsReady } })

  try {
    renderHook(useSectionNavigation)
    expect(section).toHaveFocus()
    expect(section.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'instant' })
    vi.stubGlobal('scrollY', scrollY)
    await act(async () => { finishLoadingFonts() })
    expect(section.scrollIntoView).toHaveBeenCalledTimes(alignments)
  } finally {
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
    else Reflect.deleteProperty(document, 'fonts')
  }
})

test('leaves focus alone when a deep link points at an element that is missing', () => {
  window.history.replaceState(null, '', '#missing')
  render(createElement('button', null, 'Keep focus'))
  const button = screen.getByRole('button', { name: 'Keep focus' })
  button.focus()
  renderHook(useSectionNavigation)
  expect(button).toHaveFocus()
})

test('opens the deep link before the order loads and respects focus the reader moves afterwards', () => {
  window.history.replaceState(null, '', '#work')
  render(createElement('main', null,
    createElement('section', { id: 'work', tabIndex: -1, 'aria-label': 'Selected Work' }),
    createElement('button', null, 'Dark theme'),
  ))
  const section = screen.getByRole('region', { name: 'Selected Work' })
  section.scrollIntoView = vi.fn()
  const { rerender } = renderHook(({ ready }) => useSectionNavigation(ready), { initialProps: { ready: false } })
  expect(section).toHaveFocus()
  const control = screen.getByRole('button', { name: 'Dark theme' })
  control.focus()

  rerender({ ready: true })

  expect(control).toHaveFocus()
  expect(section.scrollIntoView).toHaveBeenCalledOnce()
})

test.each([
  { preference: 'normal motion', reducedMotion: false },
  { preference: 'reduced motion', reducedMotion: true },
])('reveals offscreen sections once with $preference', ({ reducedMotion }) => {
  type VisibilityEntry = Pick<IntersectionObserverEntry, 'target' | 'isIntersecting'>
  let notifyVisibility: (entries: VisibilityEntry[]) => void = () => {}
  const observe = vi.fn()
  const unobserve = vi.fn()
  const disconnect = vi.fn()
  vi.stubGlobal('IntersectionObserver', class {
    observe = observe
    unobserve = unobserve
    disconnect = disconnect

    constructor(callback: typeof notifyVisibility) {
      notifyVisibility = callback
    }
  })
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
  }))
  render(createElement('main', null,
    createElement('section', { id: 'work', 'aria-label': 'Work already in view' }),
    createElement('section', { id: 'skills', 'aria-label': 'Skills below the fold' }),
  ))
  const work = screen.getByRole('region', { name: 'Work already in view' })
  const skills = screen.getByRole('region', { name: 'Skills below the fold' })
  vi.spyOn(skills, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: window.innerHeight + 100 }))
  const { unmount } = renderHook(useSectionNavigation)

  expect(observe).toHaveBeenCalledExactlyOnceWith(skills)
  expect(work).not.toHaveAttribute('data-revealed')
  notifyVisibility([{ target: skills, isIntersecting: false }])
  expect(skills).not.toHaveAttribute('data-revealed')
  expect(unobserve).not.toHaveBeenCalled()

  notifyVisibility([{ target: skills, isIntersecting: true }])
  if (reducedMotion) {
    expect(skills).not.toHaveAttribute('data-revealed')
  } else {
    expect(skills).toHaveAttribute('data-revealed')
  }
  expect(unobserve).toHaveBeenCalledExactlyOnceWith(skills)
  unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})
