import { useEffect, useReducer } from 'react'

export const scenarioIds = ['race', 'cancel', 'retry'] as const
export type Scenario = typeof scenarioIds[number]
export const transitMs = 650

type Phase = 'sending' | 'processing' | 'returning' | 'success' | 'error' | 'cancelled'

export type DemoRequest = {
  id: number
  phase: Phase
  nextAt: number | null
  finishedAt: number | null
  status: 200 | 500
}

type Simulation = {
  scenario: Scenario
  requests: readonly DemoRequest[]
  nextId: number
}

type Action =
  | { type: 'select'; scenario: Scenario }
  | { type: 'reset' | 'cancel' }
  | { type: 'send' | 'followUp'; now: number }
  | { type: 'advance'; id: number; at: number; observedAt: number }

const initial: Simulation = { scenario: 'race', requests: [], nextId: 1 }

export function isPending(request: DemoRequest) {
  return request.phase === 'sending' || request.phase === 'processing' || request.phase === 'returning'
}

function followUpAvailable({ scenario, requests }: Simulation) {
  const [first] = requests
  if (!first || requests.length !== 1) return false
  if (scenario === 'race') return isPending(first)
  if (scenario === 'retry') return first.phase === 'error'
  return first.phase !== 'success'
}

function cancelPending(request: DemoRequest): DemoRequest {
  return isPending(request) ? { ...request, phase: 'cancelled', nextAt: null } : request
}

function send(state: Simulation, now: number): Simulation {
  const previous = state.scenario === 'cancel' ? state.requests.map(cancelPending) : state.requests
  const status = state.scenario === 'retry' && previous.length === 0 ? 500 : 200
  const request: DemoRequest = { id: state.nextId, phase: 'sending', nextAt: now + transitMs, finishedAt: null, status }
  return { ...state, requests: [...previous, request], nextId: state.nextId + 1 }
}

function advance(state: Simulation, id: number, at: number, observedAt: number): Simulation {
  const [first] = state.requests
  const request = state.requests.find(entry => entry.id === id)
  if (!request || request.nextAt !== at) return state
  // After throttling, the next visible phase still gets its full duration.
  const now = Math.max(at, observedAt)

  let next: DemoRequest
  switch (request.phase) {
    case 'sending': {
      // In the race, hold the first answer until the newer one has arrived.
      const hold = state.scenario === 'race' && request === first
      const processingMs = state.scenario === 'cancel' && request === first ? 4700 : 750
      next = { ...request, phase: 'processing', nextAt: hold ? null : now + processingMs }
      break
    }
    case 'processing':
      next = { ...request, phase: 'returning', nextAt: now + transitMs }
      break
    case 'returning':
      next = { ...request, phase: request.status === 200 ? 'success' : 'error', nextAt: null, finishedAt: now }
      break
    default:
      return state
  }

  const releaseOlder = state.scenario === 'race' && request !== first && next.phase === 'success'
  const requests = state.requests.map(entry => {
    if (entry === request) return next
    if (releaseOlder && entry === first) return { ...entry, nextAt: now + 800 }
    return entry
  })
  return { ...state, requests }
}

function reduce(state: Simulation, action: Action): Simulation {
  switch (action.type) {
    case 'select':
      return { ...state, scenario: action.scenario, requests: [] }
    case 'reset':
      return state.requests.length ? { ...state, requests: [] } : state
    case 'send':
      return state.requests.length === 0 ? send(state, action.now) : state
    case 'followUp':
      return followUpAvailable(state) ? send(state, action.now) : state
    case 'cancel':
      return state.scenario === 'cancel' && state.requests.some(isPending)
        ? { ...state, requests: state.requests.map(cancelPending) }
        : state
    case 'advance':
      return advance(state, action.id, action.at, action.observedAt)
  }
}

export function useRequestScenarios(active: boolean) {
  const [state, dispatch] = useReducer(reduce, initial)

  useEffect(() => {
    if (!active) return
    const timers = state.requests.flatMap(request => {
      const at = request.nextAt
      if (at === null) return []
      return [window.setTimeout(() => dispatch({ type: 'advance', id: request.id, at, observedAt: performance.now() }),
        Math.max(0, Math.ceil(at - performance.now())))]
    })
    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [active, state.requests])

  return {
    ...state,
    canSend: state.requests.length === 0,
    canFollowUp: followUpAvailable(state),
    canCancel: state.scenario === 'cancel' && state.requests.some(isPending),
    send: () => dispatch({ type: 'send', now: performance.now() }),
    followUp: () => dispatch({ type: 'followUp', now: performance.now() }),
    cancel: () => dispatch({ type: 'cancel' }),
    reset: () => dispatch({ type: 'reset' }),
    select: (scenario: Scenario) => dispatch({ type: 'select', scenario }),
  }
}
