import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, PointerEvent } from 'react'
import { useLanguage } from '../../i18n/language'
import { LivingCircuit } from './LivingCircuit'
import { actions, endpoint, layers, useLivingFlow, wires } from './useLivingFlow'
import type { Port, Layer } from './useLivingFlow'

const icons = {
  refresh: 'M13 4v4H9 M13 8A5 5 0 1 0 12 12',
  pin: 'M6 3h4l-1 4 2 2v1H5V9l2-2-1-4ZM8 10v4',
  api: 'M5 5 2 8l3 3m6-6 3 3-3 3M9 3l-2 10',
  service: 'M2.5 3.5h11v3h-11zm0 6h11v3h-11zm3-4.5h.01m0 6h.01',
  data: 'M3 5v6c0 3 10 3 10 0V5m0 3c0 3-10 3-10 0m0-3c0-3 10-3 10 0S3 8 3 5Z',
} satisfies Record<Port, string>

function Icon({ id }: { id: Port }) {
  return <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"><path d={icons[id]} /></svg>
}

export function HeroArchitecture() {
  const { text: { hero: { living } } } = useLanguage()
  const layerHintId = useId()
  const board = useRef<HTMLDivElement>(null)
  const pointerFrame = useRef(0)
  const cursor = useRef({ x: 0, y: 0 })
  const [hovered, setHovered] = useState<Port | null>(null)
  const [focused, setFocused] = useState<Port | null>(null)
  const [inspected, setInspected] = useState<Layer | null>(null)
  const discovering = hovered ?? focused ?? inspected
  const { snapshot, active, activePort, stage, reduced, run, stopPreview, lit } = useLivingFlow(discovering)
  const connected = wires.filter(wire => lit.includes(wire.id)).flatMap(({ from, to }) => [from, to])
  const action = activePort === 'refresh' || activePort === 'pin' ? activePort : null
  const last = snapshot.completed
  const completion = last === 'refresh' ? living.refreshed(snapshot.revision)
    : last === 'pin' ? living.pinResult(snapshot.pinned) : ''
  const status = stage ? living.phase[stage.label]
    : discovering && discovering !== last ? living.explore[discovering]
      : completion || living.ready
  const route = action ? endpoint[action] : activePort ? living.exploring : last ? '200 OK' : living.systemReady

  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), [])
  useEffect(() => {
    if (reduced) {
      cancelAnimationFrame(pointerFrame.current)
      pointerFrame.current = 0
      board.current?.removeAttribute('data-pointer')
    }
  }, [reduced])

  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || reduced) return
    cursor.current = { x: event.clientX, y: event.clientY }
    if (pointerFrame.current) return

    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0
      const node = board.current
      if (!node) return
      const bounds = node.getBoundingClientRect()
      node.style.setProperty('--living-x', `${cursor.current.x - bounds.left}px`)
      node.style.setProperty('--living-y', `${cursor.current.y - bounds.top}px`)
      node.dataset.pointer = 'true'
    })
  }

  function leave() {
    cancelAnimationFrame(pointerFrame.current)
    pointerFrame.current = 0
    board.current?.removeAttribute('data-pointer')
    stopPreview()
    setHovered(null)
  }

  function portEvents(port: Port) {
    return {
      'data-port': port,
      'data-related': connected.includes(port),
      'data-current': (stage?.from ?? activePort) === port,
      onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === 'mouse') {
          setFocused(null)
          setHovered(port)
        }
      },
      onPointerLeave: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === 'mouse') {
          stopPreview(port)
          setHovered(current => current === port ? null : current)
        }
      },
      onFocus: (event: FocusEvent<HTMLButtonElement>) => {
        if (event.currentTarget.matches(':focus-visible')) {
          stopPreview()
          setHovered(null)
          setFocused(port)
        }
      },
      onBlur: () => {
        stopPreview(port)
        setFocused(current => current === port ? null : current)
      },
    }
  }

  return (
    <div className="living-scene">
      <div className="living-heading">
        <h2>{living.title}</h2>
        <p>{living.simulation}</p>
      </div>
      <div className="living-shell">
        <div ref={board} className="living-board" onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave}
          data-mode={active?.run ? 'request' : active ? 'preview' : 'idle'} data-exploring={Boolean(activePort)}>
          <div className="living-frontend">
            <div className="living-pane-head"><h3>Frontend</h3><span>{living.revision(snapshot.revision)}</span></div>
            <div className="living-workspace">
              <div className="living-queue">
                <h4>{living.queue}</h4>
                <ul aria-label={living.queue} aria-busy={Boolean(active?.run)}>
                  <li>
                    <span>{living.tasks.keyboard}</span>
                    <span className="living-row-state" data-pinned={snapshot.pinned}>
                      {snapshot.pinned && <Icon id="pin" />}
                      {snapshot.pinned ? living.pinned : living.open}
                    </span>
                  </li>
                  <li><span>{living.tasks.empty}</span><span className="living-row-state">{living.review}</span></li>
                  <li>
                    <span>{snapshot.revision % 2 ? living.tasks.filters : living.tasks.labels}</span>
                    <span className="living-row-state">{living.readyRow}</span>
                  </li>
                </ul>
              </div>
              <div className="living-controls">
                {actions.map(id => (
                  <button key={id} type="button" aria-pressed={id === 'pin' ? snapshot.pinned : undefined}
                    {...portEvents(id)} onClick={() => { setInspected(null); run(id) }}>
                    <Icon id={id} />
                    <span>{living.actions[id]}</span>
                    <span className="living-control-arrow" aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
              <p className="living-status">
                <span className="living-status-route">{route}</span>
                <span>{status}</span>
              </p>
              <output className="visually-hidden">{completion}</output>
            </div>
          </div>
          <div className="living-backend">
            <div className="living-pane-head"><h3>Backend</h3></div>
            <div className="living-layers">
              {layers.map(id => (
                <button key={id} type="button" aria-pressed={inspected === id} aria-label={living.layers[id].name}
                  aria-describedby={`${layerHintId}-${id}`} {...portEvents(id)}
                  onClick={() => setInspected(current => current === id ? null : id)}>
                  <Icon id={id} />
                  <span className="living-layer-text">
                    <span>{living.layers[id].name}</span>
                    <span className="living-layer-note" id={`${layerHintId}-${id}`}>{living.layers[id].hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <LivingCircuit lit={lit} signal={stage && active && !reduced ? {
            key: `${active.id}-${active.stage}`, wires: stage.wires, backwards: stage.backwards, duration: stage.duration,
          } : undefined} />
        </div>
      </div>
    </div>
  )
}
