import { useEffect, useRef, useState } from 'react'
import { readPublicSections } from './requestFlowApi'
import type { RequestResult } from './requestFlowApi'
import { phaseReadingTime, steps } from './requestFlowSteps'

type Clock = {
  index: number
  elapsed: number
  startedAt: number | null
  revision: number
}

const initial: Clock = { index: 0, elapsed: 0, startedAt: null, revision: 0 }

export function useRequestFlow(active: boolean, live: boolean) {
  const [clock, setClock] = useState(initial)
  const [result, setResult] = useState<RequestResult>({ kind: 'idle' })
  const request = useRef<AbortController | null>(null)
  const duration = Math.max(steps[clock.index].duration, phaseReadingTime)
  const finished = clock.index === steps.length - 1 && clock.elapsed === duration
  const playing = active && clock.startedAt !== null

  useEffect(() => {
    if (!active) return
    return () => request.current?.abort()
  }, [active])

  useEffect(() => {
    if (!active || clock.startedAt === null) return
    const remaining = duration - clock.elapsed - (performance.now() - clock.startedAt)
    const timer = window.setTimeout(() => {
      const now = performance.now()
      setClock(current => {
        if (current !== clock) return current
        return current.index < steps.length - 1
          ? { index: current.index + 1, elapsed: 0, startedAt: now, revision: current.revision + 1 }
          : { ...current, elapsed: duration, startedAt: null }
      })
    }, Math.max(0, remaining))
    return () => window.clearTimeout(timer)
  }, [active, clock, duration])

  function start() {
    request.current?.abort()
    const now = performance.now()
    setClock(current => ({ ...initial, revision: current.revision + 1, startedAt: now }))
    if (!live) {
      setResult({ kind: 'guided' })
      return
    }

    setResult({ kind: 'pending' })
    const controller = new AbortController()
    request.current = controller
    // The clock describes the walkthrough. The fetch has its own deadline.
    const deadline = setTimeout(() => {
      if (controller.signal.aborted) return
      controller.abort()
      setResult({ kind: 'error' })
    }, 10000)
    controller.signal.addEventListener('abort', () => clearTimeout(deadline), { once: true })
    void readPublicSections(controller.signal)
      .then(value => { if (!controller.signal.aborted) setResult(value) })
      .catch(() => { if (!controller.signal.aborted) setResult({ kind: 'error' }) })
      .finally(() => clearTimeout(deadline))
  }

  function toggle() {
    if (result.kind === 'idle') {
      start()
      return
    }
    const now = performance.now()
    setClock(current => current.startedAt === null
      ? { ...current, startedAt: now }
      : { ...current, startedAt: null, elapsed: Math.min(duration, current.elapsed + now - current.startedAt) })
  }

  function move(direction: -1 | 1) {
    setClock(current => ({
      index: Math.max(0, Math.min(steps.length - 1, current.index + direction)),
      elapsed: 0,
      startedAt: null,
      revision: current.revision + 1,
    }))
  }

  return { ...clock, playing, finished, result, start, toggle, move }
}
