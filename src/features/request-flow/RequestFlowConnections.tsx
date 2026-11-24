import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { CircuitChannel } from './RequestFlowCircuit'
import type { Channel, CircuitFrame } from './RequestFlowCircuit'
import { steps } from './requestFlowSteps'
import styles from './RequestFlowDiagram.module.css'

const screenLink: Pick<Channel, 'name' | 'outbound' | 'returning'> = {
  name: 'screen-link',
  outbound: [{ phase: 'interaction', start: 0, end: 1, amount: 0.44 }, { phase: 'communication', start: 0, end: 0.84 }],
  returning: [{ phase: 'result', start: 0.22, end: 0.68 }],
}

const databaseLink: typeof screenLink = {
  name: 'database-link',
  outbound: [{ phase: 'database', start: 0.1, end: 0.65 }],
  returning: [{ phase: 'response', start: 0.1, end: 0.55 }],
}

type Point = { x: number; y: number }
type Routes = { screen: string; database: string; scale: number; stacked: boolean }

function portPoint(path: SVGPathElement, end = false) {
  const matrix = path.getScreenCTM?.()
  if (!matrix) return
  return path.getPointAtLength(end ? path.getTotalLength() : 0).matrixTransform(matrix)
}

function horizontalCurve(start: Point, end: Point) {
  const dx = end.x - start.x
  return 'M' + start.x + ' ' + start.y + 'C' + (start.x + dx * 0.37) + ' ' + start.y + ' ' +
    (end.x - dx * 0.37) + ' ' + end.y + ' ' + end.x + ' ' + end.y
}

function verticalCurve(start: Point, end: Point, rail: number, bend: number, fromScreen: boolean) {
  // Use the empty gutter to clear the labels while keeping a horizontal connection to each SVG port.
  const descent = Math.min(bend, (end.y - start.y) / 4)
  const turn = start.y + descent
  const leave = end.y - descent
  const controls = fromScreen
    ? start.x + ' ' + (start.y + descent * 0.68) + ' ' + rail + ' ' + (start.y + descent * 0.28)
    : (start.x + (rail - start.x) * 0.58) + ' ' + start.y + ' ' + rail + ' ' + start.y
  return 'M' + start.x + ' ' + start.y + 'C' + controls + ' ' + rail + ' ' + turn +
    'V' + leave + 'Q' + rail + ' ' + end.y + ' ' + end.x + ' ' + end.y
}

function connectionRoute(start: Point, end: Point, bounds: DOMRect, scale: number, stacked: boolean, fromScreen: boolean) {
  const local = (point: Point) => ({
    x: Math.round((point.x - bounds.left) * 1000 / scale) / 1000,
    y: Math.round((point.y - bounds.top) * 1000 / scale) / 1000,
  })
  const a = local(start)
  const b = local(end)
  return stacked
    ? verticalCurve(a, b, (fromScreen ? 8 : bounds.width - 8) / scale, 30 / scale, fromScreen)
    : horizontalCurve(a, b)
}

function Connection({ channel, path, frame, stacked }: {
  channel: typeof screenLink
  path: string
  frame: CircuitFrame
  stacked: boolean
}) {
  return (
    <>
      <path className={styles.trackEcho} d={path} transform={stacked ? 'translate(6 0)' : 'translate(0 6)'} />
      <CircuitChannel channel={{ ...channel, path }} frame={frame} className={styles.track} />
    </>
  )
}

export function RequestFlowConnections({ scene, frame, playing }: {
  scene: RefObject<HTMLDivElement | null>
  frame: CircuitFrame
  playing: boolean
}) {
  const overlay = useRef<SVGSVGElement>(null)
  const [routes, setRoutes] = useState<Routes>()
  const trackScreenMotion = steps[frame.index].id === 'interaction' && frame.moving && playing

  useLayoutEffect(() => {
    const root = scene.current
    const svg = overlay.current
    const screen = root?.querySelector<HTMLElement>('[data-screen]')
    const preview = root?.querySelector<HTMLElement>('[data-screen-preview]')
    const inlet = root?.querySelector<SVGPathElement>('[data-dock="server-inlet"] path')
    const outlet = root?.querySelector<SVGPathElement>('[data-dock="server-outlet"] path')
    const databaseLeft = root?.querySelector<SVGPathElement>('[data-dock="database-left"] path')
    const databaseRight = root?.querySelector<SVGPathElement>('[data-dock="database-right"] path')
    const server = inlet?.ownerSVGElement
    if (!root || !svg || !screen || !preview || !inlet || !outlet || !databaseLeft || !databaseRight ||
      !server || !inlet.getScreenCTM) return

    let animationFrame = 0
    const measure = () => {
      animationFrame = 0
      const bounds = svg.getBoundingClientRect()
      const screenBounds = screen.getBoundingClientRect()
      const previewBounds = preview.getBoundingClientRect()
      const stacked = screenBounds.bottom <= server.getBoundingClientRect().top
      const enter = portPoint(inlet)
      const exit = portPoint(outlet, true)
      const databasePath = stacked ? databaseRight : databaseLeft
      const database = portPoint(databasePath)
      const scale = server.getScreenCTM()?.a
      const databaseScale = databasePath.getScreenCTM()?.a
      if (!bounds.width || !enter || !exit || !database || !scale || !databaseScale) return
      const screenPort = stacked
        ? { x: screenBounds.left + screenBounds.width / 2, y: screenBounds.bottom }
        : { x: screenBounds.right, y: previewBounds.top + previewBounds.height * 0.64 }
      root.style.setProperty('--database-dock-scale', String(scale / databaseScale))
      const next = {
        screen: connectionRoute(screenPort, enter, bounds, scale, stacked, true),
        database: connectionRoute(exit, database, bounds, scale, stacked, false),
        scale,
        stacked,
      }
      setRoutes(current => current?.screen === next.screen && current?.scale === scale && current?.database === next.database &&
        current?.stacked === stacked ? current : next)

      // ResizeObserver covers layout; the existing send transform needs sampling while it moves.
      if (trackScreenMotion && screen.getAnimations?.().some(animation => animation.playState === 'running')) {
        schedule()
      }
    }
    function schedule() {
      if (!animationFrame) animationFrame = requestAnimationFrame(measure)
    }

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined
    if (observer) {
      for (const element of [root, screen, preview, ...root.querySelectorAll('[data-system]')]) observer.observe(element)
    } else {
      window.addEventListener('resize', schedule)
    }
    measure()
    return () => {
      if (observer) observer.disconnect()
      else window.removeEventListener('resize', schedule)
      cancelAnimationFrame(animationFrame)
    }
  }, [scene, trackScreenMotion])

  return (
    <svg ref={overlay} className={styles.connection} fill="none" aria-hidden="true">
      {routes && (
        <g transform={'scale(' + routes.scale + ')'}>
          <Connection channel={screenLink} path={routes.screen} frame={frame} stacked={routes.stacked} />
          <Connection channel={databaseLink} path={routes.database} frame={frame} stacked={routes.stacked} />
        </g>
      )}
    </svg>
  )
}
