import { useEffect } from 'react'
import type { RefObject } from 'react'

function startObserver<T extends { disconnect(): void }>(create: () => T, observe: (observer: T) => void) {
  let observer: T | undefined
  try {
    observer = create()
    observe(observer)
    return observer
  } catch {
    // Static content remains usable if the browser cannot start an observer.
    observer?.disconnect()
  }
}

export function useExperienceTimeline(sectionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = sectionRef.current
    const timeline = section?.querySelector<HTMLOListElement>('.experience-timeline')
    if (!section || !timeline) return

    const entries = Array.from(timeline.children)
    const heading = section.querySelector('.section-title')
    const introduction = section.querySelector('.experience-employment')
    const projects = timeline.querySelectorAll('.experience-project')
    const orderGroup = section.closest('.portfolio-order-group')
    const orderItem = section.closest('.portfolio-order-item')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let frame = 0
    let progress = -1
    let active: Element | undefined

    const update = () => {
      frame = 0
      const root = document.documentElement
      const header = parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0
      const center = (Math.min(header, root.clientHeight) + root.clientHeight) / 2
      const { top, bottom, height } = timeline.getBoundingClientRect()
      if (height <= 0) return

      let distance = center - top
      let scrollRange = height
      let atEnd = false
      if (orderItem && orderItem === orderGroup?.lastElementChild) {
        const scrollLimit = root.scrollHeight - root.clientHeight
        const remainingScroll = Math.max(0, scrollLimit - root.scrollTop)
        if (scrollLimit > 0) {
          // Fit the rail to the remaining scroll and start earlier if the center cannot reach it.
          const centerRange = distance + remainingScroll
          const visibleRange = root.clientHeight - top + remainingScroll
          const minimumRange = Math.min(height / 2, visibleRange)
          scrollRange = Math.max(1, Math.min(height, Math.max(centerRange, minimumRange)))
          distance += Math.max(0, scrollRange - centerRange)
          atEnd = remainingScroll <= 1
        }
      }
      const nextProgress = atEnd ? 1 : Math.min(1, Math.max(0, distance / scrollRange))
      const readingLine = top + nextProgress * height
      const nextActive = atEnd ? entries.at(-1) : distance >= 0 && readingLine < bottom
        ? entries.find(entry => entry.getBoundingClientRect().bottom > readingLine)
        : undefined

      if (!reduced?.matches && nextProgress !== progress) {
        progress = nextProgress
        timeline.style.setProperty('--experience-progress', String(progress))
      }
      if (nextActive !== active) {
        active?.removeAttribute('data-active')
        active?.removeAttribute('aria-current')
        nextActive?.setAttribute('data-active', '')
        nextActive?.setAttribute('aria-current', 'true')
        active = nextActive
      }
    }

    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    function finishEntrance(event: AnimationEvent) {
      if (event.animationName === 'experience-enter' && event.target instanceof Element) {
        event.target.removeAttribute('data-experience-revealed')
      }
    }

    const clearEntrances = () => {
      section.querySelectorAll('[data-experience-revealed]').forEach(target => {
        target.removeAttribute('data-experience-revealed')
      })
    }

    function onMotionChange() {
      if (reduced?.matches) {
        clearEntrances()
        timeline?.style.removeProperty('--experience-progress')
        progress = -1
      }
      scheduleUpdate()
    }

    const reveal = (observations: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      for (const { isIntersecting, target } of observations) {
        if (!isIntersecting) continue
        observer.unobserve(target)
        if (reduced?.matches || section.closest('[data-editing]') || target.contains(document.activeElement)) continue
        target.setAttribute('data-experience-revealed', '')
      }
    }

    const visibility = typeof IntersectionObserver === 'undefined' ? undefined : startObserver(
      () => new IntersectionObserver(reveal),
      observer => {
        if (heading) observer.observe(heading)
        if (introduction) observer.observe(introduction)
        projects.forEach(project => observer.observe(project))
      },
    )
    const size = typeof ResizeObserver === 'undefined' ? undefined : startObserver(
      () => new ResizeObserver(scheduleUpdate),
      observer => {
        observer.observe(timeline)
        observer.observe(document.body)
      },
    )
    const order = orderGroup && typeof MutationObserver !== 'undefined' ? startObserver(
      () => new MutationObserver(scheduleUpdate),
      observer => {
        observer.observe(orderGroup, { childList: true })
        // Sortable sections move through transforms without changing the list's size.
        if (orderItem) observer.observe(orderItem, { attributeFilter: ['style'] })
      },
    ) : undefined
    function trackDisclosure(event: Event) {
      if (event.target instanceof Element && event.target.closest('.experience-details-toggle, .experience-details-panel')) {
        scheduleUpdate()
      }
    }
    if (!size) {
      timeline.addEventListener('click', trackDisclosure)
      timeline.addEventListener('transitionend', trackDisclosure)
      timeline.addEventListener('transitioncancel', trackDisclosure)
    }
    reduced?.addEventListener?.('change', onMotionChange)
    section.addEventListener('animationend', finishEntrance)
    section.addEventListener('animationcancel', finishEntrance)
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    scheduleUpdate()

    return () => {
      visibility?.disconnect()
      size?.disconnect()
      order?.disconnect()
      if (!size) {
        timeline.removeEventListener('click', trackDisclosure)
        timeline.removeEventListener('transitionend', trackDisclosure)
        timeline.removeEventListener('transitioncancel', trackDisclosure)
      }
      reduced?.removeEventListener?.('change', onMotionChange)
      section.removeEventListener('animationend', finishEntrance)
      section.removeEventListener('animationcancel', finishEntrance)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      cancelAnimationFrame(frame)
      active?.removeAttribute('data-active')
      active?.removeAttribute('aria-current')
      timeline.style.removeProperty('--experience-progress')
      clearEntrances()
    }
  }, [sectionRef])
}
