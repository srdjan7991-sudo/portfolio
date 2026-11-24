import { useEffect, useRef, useState } from 'react'

export const actions = ['refresh', 'pin'] as const
export const layers = ['api', 'service', 'data'] as const
export type Action = (typeof actions)[number]
export type Layer = (typeof layers)[number]
export type Port = Action | Layer
export type Wire = 'refresh-api' | 'pin-api' | 'api-service' | 'service-data'

export const wires = [
  { id: 'refresh-api', from: 'refresh', to: 'api' },
  { id: 'pin-api', from: 'pin', to: 'api' },
  { id: 'api-service', from: 'api', to: 'service' },
  { id: 'service-data', from: 'service', to: 'data' },
] as const satisfies readonly { id: Wire; from: Port; to: Port }[]

export const endpoint = {
  refresh: 'GET /api/queue',
  pin: 'PUT /api/queue/pin',
} satisfies Record<Action, string>

type Stage = {
  wires: Wire[]
  backwards?: boolean
  from: Port
  label: 'sending' | 'routing' | 'accessing' | 'responding' | 'returning' | 'tracing'
  duration: number
}

type Trip = { id: number; port: Port; run: boolean; stage: number }
type Snapshot = { revision: number; pinned: boolean; completed: Action | null }

function isAction(port: Port): port is Action {
  return port === 'refresh' || port === 'pin'
}

function route(port: Port): Stage[] {
  if (isAction(port)) return [
    { wires: [`${port}-api`], from: port, label: 'sending', duration: 295 },
    { wires: ['api-service'], from: 'api', label: 'routing', duration: 235 },
    { wires: ['service-data'], from: 'service', label: 'accessing', duration: 245 },
    { wires: ['service-data'], from: 'data', label: 'responding', backwards: true, duration: 270 },
    { wires: ['api-service'], from: 'service', label: 'returning', backwards: true, duration: 205 },
    { wires: [`${port}-api`], from: 'api', label: 'returning', backwards: true, duration: 310 },
  ]

  const upstream: Stage[] = [
    { wires: ['service-data'], from: 'data', label: 'tracing', backwards: true, duration: 235 },
    { wires: ['api-service'], from: 'service', label: 'tracing', backwards: true, duration: 235 },
    { wires: ['refresh-api', 'pin-api'], from: 'api', label: 'tracing', backwards: true, duration: 335 },
  ]
  return upstream.slice(layers.length - layers.indexOf(port) - 1)
}

function apply(snapshot: Snapshot, action: Action): Snapshot {
  return {
    revision: snapshot.revision + (action === 'refresh' ? 1 : 0),
    pinned: action === 'pin' ? !snapshot.pinned : snapshot.pinned,
    completed: action,
  }
}

const motionPreference = '(prefers-reduced-motion: reduce)'

export function useLivingFlow(port: Port | null) {
  const [{ snapshot, trip }, setFlow] = useState<{ snapshot: Snapshot; trip: Trip | null }>({
    snapshot: { revision: 1, pinned: false, completed: null }, trip: null,
  })
  const [reduced, setReduced] = useState(() => window.matchMedia?.(motionPreference)?.matches ?? false)
  const nextId = useRef(0)

  useEffect(() => {
    const media = window.matchMedia?.(motionPreference)
    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    media?.addEventListener?.('change', handleChange)
    return () => media?.removeEventListener?.('change', handleChange)
  }, [])

  useEffect(() => {
    if (!port || reduced) return
    const timer = window.setTimeout(() => {
      const id = ++nextId.current
      setFlow(current => current.trip?.run ? current : { ...current, trip: { id, port, run: false, stage: 0 } })
    }, 115)
    return () => window.clearTimeout(timer)
  }, [port, reduced])

  const active = trip && (trip.run || trip.port === port) ? trip : null
  const activePort = active?.port ?? port
  const sequence = activePort ? route(activePort) : []
  const stage = active ? sequence[active.stage] : undefined
  const duration = stage?.duration
  const lastStage = active?.stage === sequence.length - 1

  useEffect(() => {
    if (!active || duration === undefined) return

    function advance() {
      if (!active) return
      setFlow(current => {
        if (current.trip !== active) return current
        if (!reduced && !lastStage) return { ...current, trip: { ...active, stage: active.stage + 1 } }
        return {
          trip: null,
          snapshot: active.run && isAction(active.port) ? apply(current.snapshot, active.port) : current.snapshot,
        }
      })
    }

    if (reduced) {
      advance()
      return
    }
    const timer = window.setTimeout(advance, duration)
    return () => window.clearTimeout(timer)
  }, [active, duration, lastStage, reduced])

  function run(action: Action) {
    if (window.matchMedia?.(motionPreference)?.matches ?? reduced) {
      setFlow(current => ({ trip: null, snapshot: apply(current.snapshot, action) }))
      return
    }
    const id = ++nextId.current
    setFlow(current => ({ ...current, trip: { id, port: action, run: true, stage: 0 } }))
  }

  function stopPreview(port?: Port) {
    setFlow(current => current.trip && !current.trip.run && (!port || current.trip.port === port)
      ? { ...current, trip: null }
      : current)
  }

  return { snapshot, active, activePort, stage, reduced, run, stopPreview, lit: sequence.flatMap(item => item.wires) }
}
