import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { defaultSectionOrder } from '../sections'
import type { SectionKey } from '../sections'
import { useLanguage } from '../i18n/language'

type SectionTarget = { id: SectionKey; element: HTMLElement }

export function useActiveSection(header: { readonly current: HTMLElement | null }, order: readonly SectionKey[]) {
  const { language } = useLanguage()
  const [activeSection, setActiveSection] = useState<SectionKey>()

  useEffect(() => {
    const sections = order
      .map(id => {
        const element = document.getElementById(id)
        return element ? { id, element } : null
      })
      .filter(section => section !== null)
    let frame = 0

    function update() {
      frame = 0
      const root = document.documentElement
      const headerHeight = header.current?.getBoundingClientRect().height ?? 0
      const readingLine = Math.max(headerHeight + 24, root.clientHeight * 0.3)
      const lastScrollPosition = root.scrollHeight - root.clientHeight

      let current: SectionTarget | undefined
      for (const section of sections) {
        if (section.element.getBoundingClientRect().top > readingLine) break
        current = section
      }
      if (lastScrollPosition > 0 && window.scrollY >= lastScrollPosition - 2) {
        // On tall viewports, multiple links can share the browser's last scroll position.
        const requested = sections.find((section) => `#${section.id}` === location.hash)
        const requestedTop = requested?.element.getBoundingClientRect().top ?? 0
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
  const realign = useRef<() => void>(null)
  const waitingForOrder = useRef(!orderReady)
  useLayoutEffect(() => {
    // A deep link can arrive before React has inserted the target into the document.
    const hash = location.hash
    const target = document.getElementById(hash.slice(1))
    if (!target) return

    target.focus({ preventScroll: true })
    target.scrollIntoView({ behavior: 'instant' })

    let initialScroll = window.scrollY
    let cancelled = false
    function alignWhileUntouched() {
      if (target && !cancelled && location.hash === hash && document.activeElement === target && window.scrollY === initialScroll) {
        target.scrollIntoView({ behavior: 'instant' })
        initialScroll = window.scrollY
      }
    }
    realign.current = alignWhileUntouched
    void document.fonts?.ready.then(alignWhileUntouched)
    return () => { cancelled = true; realign.current = null }
  }, [])

  useLayoutEffect(() => {
    if (orderReady && waitingForOrder.current) {
      waitingForOrder.current = false
      realign.current?.()
    }
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
      if (section && !section.hasAttribute('data-custom-reveal') && section.getBoundingClientRect().top >= window.innerHeight) {
        observer.observe(section)
      }
    }

    return () => observer.disconnect()
  }, [])
}
