import { useLayoutEffect, useRef, useState } from 'react'
import { wires } from './useLivingFlow'
import type { Wire } from './useLivingFlow'

type Point = { x: number; y: number }
type Connection = { id: Wire; path: string; track?: { start: Point; end: Point } }

function measure(board: HTMLDivElement): Connection[] {
  const bounds = board.getBoundingClientRect()
  const compact = getComputedStyle(board).getPropertyValue('--living-compact').trim() === '1'

  return wires.flatMap(({ id, from, to }) => {
    const source = board.querySelector(`[data-port="${from}"]`)?.getBoundingClientRect()
    const target = board.querySelector(`[data-port="${to}"]`)?.getBoundingClientRect()
    if (!source || !target) return []

    const branch = to === 'api'
    const vertical = branch ? compact : !compact
    const portGap = branch ? (from === 'refresh' ? -5 : 5) : 0
    const point = (x: number, y: number) => ({ x: Math.round((x - bounds.left) * 10) / 10, y: Math.round((y - bounds.top) * 10) / 10 })
    const start = vertical
      ? point(source.left + source.width / 2, source.bottom)
      : point(source.right, source.top + source.height / 2)
    const end = vertical
      ? point(target.left + target.width / 2 + portGap, target.top)
      : point(target.left, target.top + target.height / 2 + portGap)

    const middle = vertical ? (start.y + end.y) / 2 : (start.x + end.x) / 2
    const curve = vertical ? `${start.x} ${middle} ${end.x} ${middle}` : `${middle} ${start.y} ${middle} ${end.y}`
    return [{ id, path: `M ${start.x} ${start.y} C ${curve} ${end.x} ${end.y}`, track: branch ? { start, end } : undefined }]
  })
}

type Signal = {
  key: string
  wires: Wire[]
  backwards?: boolean
  duration: number
}

export function LivingCircuit({ lit, signal }: {
  lit: Wire[]
  signal?: Signal
}) {
  const [connections, setConnections] = useState<Connection[]>([])
  const svg = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const node = svg.current?.parentElement
    if (!(node instanceof HTMLDivElement)) return
    let frame = 0

    function update() {
      if (!(node instanceof HTMLDivElement)) return
      const next = measure(node)
      setConnections(current => current.length === next.length &&
        current.every((connection, index) => connection.path === next[index].path) ? current : next)
    }

    function schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    observer?.observe(node)
    node.querySelectorAll('[data-port], .living-frontend, .living-backend').forEach(port => observer?.observe(port))
    window.addEventListener('resize', schedule)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <svg ref={svg} className="living-circuit" aria-hidden="true" focusable="false" fill="none">
      {connections.map(({ id, path, track }) => (
        <g key={id} data-wire={id} data-lit={lit.includes(id)}>
          {track && (
            <>
              <path className="living-wire" d={path} pathLength="1" />
              <circle className="living-port" cx={track.start.x} cy={track.start.y} r="2.4" />
              <circle className="living-port" cx={track.end.x} cy={track.end.y} r="2.4" />
            </>
          )}
          {signal?.wires.includes(id) && (
            <path key={signal.key} className="living-signal" data-backwards={Boolean(signal.backwards)}
              d={path} pathLength="1" style={{ animationDuration: `${signal.duration}ms` }} />
          )}
        </g>
      ))}
    </svg>
  )
}
