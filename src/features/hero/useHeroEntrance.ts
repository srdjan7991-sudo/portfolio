import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

const reducedMotion = '(prefers-reduced-motion: reduce)'
const visibleFraction = 0.001

export function useHeroEntrance(
  heroRef: RefObject<HTMLElement | null>,
  visualRef: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const hero = heroRef.current
    const visual = visualRef.current
    const preference = window.matchMedia?.(reducedMotion)
    const inPageNavigation = () => location.hash !== '' && location.hash !== '#top'
    if (!hero || !visual || !preference?.addEventListener || preference.matches || inPageNavigation() ||
        typeof IntersectionObserver !== 'function' || !window.CSS?.supports?.('clip-path', 'inset(0)')) return

    const section = hero
    const frame = visual
    const viewportBottom = document.documentElement.clientHeight
    if (section.getBoundingClientRect().bottom <= 0) return

    let observer: IntersectionObserver | undefined
    try {
      observer = new IntersectionObserver(entries => {
        const entry = entries.at(-1)
        if (!entry || !frame.dataset.heroWindow) return
        if (entry.isIntersecting && entry.intersectionRatio >= visibleFraction) frame.dataset.heroWindow = 'opening'
        else if (frame.dataset.heroWindow === 'opening') settle()
      }, { threshold: [0, visibleFraction] })
      observer.observe(frame)
    } catch {
      observer?.disconnect()
      return
    }

    section.dataset.heroIntro = ''
    const bounds = frame.getBoundingClientRect()
    if (bounds.bottom <= 0) observer.disconnect()
    else {
      const visibleHeight = Math.min(bounds.bottom, viewportBottom) - Math.max(bounds.top, 0)
      frame.dataset.heroWindow = visibleHeight >= bounds.height * visibleFraction ? 'opening' : 'waiting'
    }

    function finishWindow() {
      delete frame.dataset.heroWindow
      observer?.disconnect()
    }

    function settle() {
      delete section.dataset.heroIntro
      finishWindow()
    }

    function finishAnimation(event: AnimationEvent) {
      if (event.animationName === 'hero-window-open') finishWindow()
      if (event.animationName === 'hero-title-complete') delete section.dataset.heroIntro
    }

    function onPreferenceChange(event: MediaQueryListEvent) {
      if (event.matches) settle()
    }

    function onNavigation() {
      if (inPageNavigation()) settle()
    }

    section.addEventListener('animationend', finishAnimation)
    section.addEventListener('animationcancel', finishAnimation)
    preference.addEventListener('change', onPreferenceChange)
    window.addEventListener('hashchange', onNavigation)
    return () => {
      section.removeEventListener('animationend', finishAnimation)
      section.removeEventListener('animationcancel', finishAnimation)
      preference.removeEventListener('change', onPreferenceChange)
      window.removeEventListener('hashchange', onNavigation)
      settle()
    }
  }, [heroRef, visualRef])
}
