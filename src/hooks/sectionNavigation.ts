import { useEffect, useLayoutEffect, useState } from 'react'
import { defaultSectionOrder, isSectionKey } from '../sections'
import { useLanguage } from '../i18n/language'

export function useActiveSection(header: { readonly current: HTMLElement | null }, order: readonly string[] = defaultSectionOrder) {
  const { language } = useLanguage()
  const [activeSection, setActiveSection] = useState<string>()

  useEffect(() => {
    const sections = order
      .filter(isSectionKey)
      .map(id => document.getElementById(id))
      .filter((section) => section !== null)
    let frame = 0

    function update() {
      frame = 0
      const root = document.documentElement
      const headerHeight = header.current?.getBoundingClientRect().height ?? 0
      const readingLine = Math.max(headerHeight + 24, root.clientHeight * 0.3)
      const lastScrollPosition = root.scrollHeight - root.clientHeight

      let current: HTMLElement | undefined
      for (const section of sections) {
        if (section.getBoundingClientRect().top > readingLine) break
        current = section
      }
      if (lastScrollPosition > 0 && window.scrollY >= lastScrollPosition - 2) {
        // On tall viewports, multiple links can share the browser's last scroll position.
        const requested = sections.find((section) => `#${section.id}` === location.hash)
        const requestedTop = requested?.getBoundingClientRect().top ?? 0
        current = requested && requestedTop > headerHeight + 25 && requestedTop < root.clientHeight
          ? requested
          : sections.at(-1)
      }

      setActiveSection(current?.id)
    }

    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('hashchange', scheduleUpdate)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('hashchange', scheduleUpdate)
    }
  }, [header, order, language])

  return activeSection
}

export function useSectionNavigation(orderReady = true) {
  useLayoutEffect(() => {
    if (!orderReady) return
    // A deep link can arrive before React has inserted the target into the document.
    const hash = location.hash
    const target = document.getElementById(hash.slice(1))
    if (!target) return

    target.focus({ preventScroll: true })
    target.scrollIntoView({ behavior: 'instant' })

    const initialScroll = window.scrollY
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (!cancelled && location.hash === hash && window.scrollY === initialScroll) {
        target.scrollIntoView({ behavior: 'instant' })
      }
    })
    return () => { cancelled = true }
  }, [orderReady])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        observer.unobserve(entry.target)
        if (!reducedMotion.matches) {
          entry.target.setAttribute('data-revealed', '')
        }
      }
    }, { threshold: 0.08 })

    for (const id of defaultSectionOrder) {
      const section = document.getElementById(id)
      // Preserve the initial view, including direct links and restored scroll positions.
      if (section && section.getBoundingClientRect().top >= window.innerHeight) {
        observer.observe(section)
      }
    }

    return () => observer.disconnect()
  }, [])
}
