import { useEffect } from 'react'
import type { RefObject } from 'react'

const navigationClearance = 90
const preloadDistance = 120

export function useArchitectureScene(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const track = ref.current
    if (!track || typeof IntersectionObserver !== 'function') return

    const stage = track.querySelector<HTMLElement>('[data-architecture-stage]')
    const canvas = track.querySelector<HTMLCanvasElement>('[data-architecture-canvas]')
    if (!stage || !canvas) return
    const elements = { track, stage, canvas }

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!reduced) return
    let nearby = false
    let disposed = false
    let failed = false
    let loading = false
    let release: ((keepSceneInView?: boolean) => void) | undefined

    function fallback() {
      failed = true
      release?.(true)
      release = undefined
      elements.track.dataset.renderer = 'fallback'
    }

    async function prepare() {
      if (!nearby || disposed || reduced.matches || loading || failed || release) return
      loading = true
      try {
        const { playArchitecture } = await import('./playArchitecture')
        const view = elements.stage.getBoundingClientRect()
        // A deep link to the interface can leave the illustration behind the fixed navigation.
        if (!disposed && !reduced.matches && nearby &&
          view.bottom > navigationClearance && view.top < innerHeight + preloadDistance) {
          release = playArchitecture(elements.track, elements.stage, elements.canvas, fallback)
          if (!release) fallback()
        }
      } catch {
        if (!disposed) fallback()
      } finally {
        loading = false
      }
    }

    function onPreferenceChange() {
      if (reduced.matches) {
        release?.(true)
        release = undefined
      } else {
        void prepare()
      }
    }

    let proximity: IntersectionObserver | undefined
    try {
      proximity = new IntersectionObserver(([entry]) => {
        nearby = Boolean(entry?.isIntersecting)
        void prepare()
      }, { rootMargin: `-${navigationClearance}px 0px ${preloadDistance}px` })
      proximity.observe(stage)
    } catch {
      proximity?.disconnect()
      return
    }
    reduced.addEventListener('change', onPreferenceChange)

    return () => {
      disposed = true
      proximity.disconnect()
      reduced.removeEventListener('change', onPreferenceChange)
      release?.()
    }
  }, [ref])
}
