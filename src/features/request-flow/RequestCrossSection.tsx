import { motion, useMotionValue, useScroll, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useId, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useLanguage } from '../../i18n/language'
import { systems } from './requestFlowSteps'
import styles from './RequestCrossSection.module.css'

const animatedScene = '(min-width: 60rem) and (min-height: 51rem) and (prefers-reduced-motion: no-preference)'
const planeWidth = 182
type Point = readonly [x: number, y: number]
type Layer = 0 | 1 | 2
const layers = [0, 1, 2] as const

const assembled = [[308, 74], [328, 64], [348, 54]] as const
const separated = [[44, 92], [337, 38], [630, 85]] as const
const aligned = [[44, 66], [337, 66], [630, 66]] as const
const compact = [[18, 13], [116, 112], [214, 211]] as const
const compactScale = 0.7
const planeHeight = 110
const returnPort = 87
const requestPort = 48
const compactPorts = {
  request: { top: 36, bottom: 158 },
  response: { top: 18, bottom: 126 },
}

const copy = {
  en: {
    label: 'Request architecture', request: 'Request', response: 'Response', hint: 'Select a layer to see its role.',
    route: 'The request goes from the browser through the application server to the database. The result returns along the same route.',
  },
  sr: {
    label: 'Arhitektura zahteva', request: 'Zahtev', response: 'Odgovor', hint: 'Izaberi sloj da vidiš njegovu ulogu.',
    route: 'Zahtev ide od browsera preko aplikacionog servera do baze podataka. Rezultat se vraća istim putem.',
  },
}

function range(value: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (value - start) / (end - start)))
}

function ease(value: number) {
  return value * value * (3 - 2 * value)
}

function interpolate(from: Point, to: Point, amount: number): Point {
  return [from[0] + (to[0] - from[0]) * amount, from[1] + (to[1] - from[1]) * amount]
}

function position(layer: Layer, progress: number): Point {
  return progress < 0.66
    ? interpolate(assembled[layer], separated[layer], ease(range(progress, 0.2, 0.66)))
    : interpolate(separated[layer], aligned[layer], ease(range(progress, 0.66, 0.94)))
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(animatedScene)
  media?.addEventListener?.('change', onChange)
  return () => media?.removeEventListener?.('change', onChange)
}

function supportsAnimatedScene() {
  return window.matchMedia?.(animatedScene).matches ?? false
}

function Arrow({ marker }: { marker: string }) {
  return <defs>
    <marker id={marker} viewBox="0 0 8 8" markerWidth="6" markerHeight="6" refX="8" refY="4" orient="auto">
      <path d="M1 1 7 4 1 7" className={styles.arrow} />
    </marker>
  </defs>
}

function AnimatedLayers({ target, selected }: { target: RefObject<HTMLDivElement | null>; selected: Layer | null }) {
  const { scrollYProgress } = useScroll({ target, offset: ['start 65%', 'end 85%'] })
  return <Layers progress={scrollYProgress} selected={selected} />
}

function Layers({ progress, selected }: { progress: MotionValue<number>; selected: Layer | null }) {
  const marker = useId()
  return (
    <svg className={styles.graphic} viewBox="0 0 866 240" aria-hidden="true" focusable="false">
      <Arrow marker={marker} />
      <path className={styles.guides} d="M44 210H812 M135 22V210 M428 22V210 M721 22V210" />
      <Cable progress={progress} from={0} to={1} marker={marker} />
      <Cable progress={progress} from={1} to={2} marker={marker} />
      <Cable progress={progress} from={0} to={1} marker={marker} response />
      <Cable progress={progress} from={1} to={2} marker={marker} response />
      <Plane progress={progress} layer={2} selected={selected === 2} />
      <Plane progress={progress} layer={1} selected={selected === 1} />
      <Plane progress={progress} layer={0} selected={selected === 0} />
    </svg>
  )
}

function Cable({ progress, from, to, marker, response = false }: {
  progress: MotionValue<number>; from: Layer; to: Layer; marker: string; response?: boolean
}) {
  const path = useTransform(progress, value => {
    const [fromX, fromY] = position(from, value)
    const [toX, toY] = position(to, value)
    const left = fromX + planeWidth
    const span = Math.max(0, toX - left)
    const port = response ? returnPort : requestPort
    const start = fromY + port
    const end = toY + port
    return response
      ? `M${toX} ${end} C${toX - span * 0.42} ${end} ${left + span * 0.42} ${start} ${left} ${start}`
      : `M${left} ${start} C${left + span * 0.42} ${start} ${toX - span * 0.42} ${end} ${toX} ${end}`
  })
  const opacity = useTransform(progress, value => ease(range(value, response ? 0.68 : 0.52, response ? 0.89 : 0.64)))
  return <motion.path d={path} style={{ opacity }} className={styles.cable} data-response={response} markerEnd={`url(#${marker})`} />
}

function Plane({ progress, layer, selected }: { progress: MotionValue<number>; layer: Layer; selected: boolean }) {
  const transform = useTransform(progress, value => {
    const [x, y] = position(layer, value)
    return `translate(${x}px, ${y}px)`
  })
  return (
    <motion.g style={{ transform }} className={styles.plane} data-selected={selected}>
      <PlaneFace layer={layer} />
      {layer !== 0 && <><circle cx="0" cy={requestPort} r="3" className={styles.port} /><circle cx="0" cy={returnPort} r="3" className={styles.port} /></>}
      {layer !== 2 && <><circle cx={planeWidth} cy={requestPort} r="3" className={styles.port} /><circle cx={planeWidth} cy={returnPort} r="3" className={styles.port} /></>}
    </motion.g>
  )
}

function PlaneFace({ layer }: { layer: Layer }) {
  return <>
    <path className={styles.depth} d="M3 104 178 104 190 94V109L179 119H12L3 113Z" />
    <rect width={planeWidth} height={planeHeight} rx="6" className={styles.face} />
    <path className={styles.planeRule} d={`M0 25H${planeWidth}`} />
    <circle cx="13" cy="13" r="2" />
    <circle cx="21" cy="13" r="2" />
    <circle cx="29" cy="13" r="2" />
    <text x="167" y="18" textAnchor="end" className={styles.number}>0{layer + 1}</text>
    <LayerDrawing layer={layer} />
  </>
}

function CompactLayers({ selected }: { selected: Layer | null }) {
  const marker = useId()

  function cable(from: 0 | 1, response: boolean) {
    const { top, bottom } = compactPorts[response ? 'response' : 'request']
    const [fromX, fromY] = compact[from]
    const [toX, toY] = compact[from + 1]
    const x = fromX + bottom * compactScale
    const y = fromY + planeHeight * compactScale
    const end = toX + top * compactScale
    const center = (y + toY) / 2
    return response
      ? `M${end} ${toY} C${end} ${center} ${x} ${center} ${x} ${y}`
      : `M${x} ${y} C${x} ${center} ${end} ${center} ${end} ${toY}`
  }

  return (
    <svg className={styles.compactGraphic} viewBox="0 0 366 305" aria-hidden="true" focusable="false">
      <Arrow marker={marker} />
      {([0, 1] as const).map(from => (
        <g key={from}>
          <path d={cable(from, false)} className={styles.cable} markerEnd={`url(#${marker})`} />
          <path d={cable(from, true)} className={styles.cable} data-response="true" markerEnd={`url(#${marker})`} />
        </g>
      ))}
      {layers.map(layer => (
        <g key={layer} transform={`translate(${compact[layer].join(' ')}) scale(${compactScale})`}
          className={styles.plane} data-selected={selected === layer}>
          <PlaneFace layer={layer} />
          {layer !== 0 && <><circle cx={compactPorts.request.top} r="3" className={styles.port} /><circle cx={compactPorts.response.top} r="3" className={styles.port} /></>}
          {layer !== 2 && <><circle cx={compactPorts.request.bottom} cy={planeHeight} r="3" className={styles.port} /><circle cx={compactPorts.response.bottom} cy={planeHeight} r="3" className={styles.port} /></>}
        </g>
      ))}
    </svg>
  )
}

function LayerDrawing({ layer }: { layer: Layer }) {
  if (layer === 0) {
    return <g className={styles.drawing}>
      <rect x="18" y="38" width="36" height="57" rx="2" />
      <path d="M26 49h20m-20 10h16m-16 10h20m-20 10h13 M67 95V38m0 57h97m-97-12 19-8 17 5 24-27 15 8 17-12" />
    </g>
  }
  if (layer === 1) {
    return <g className={styles.drawing}>
      <rect x="25" y="42" width="132" height="21" rx="3" />
      <rect x="25" y="72" width="132" height="21" rx="3" />
      <circle cx="37" cy="52.5" r="2" /><circle cx="37" cy="82.5" r="2" />
      <path d="M53 53h23m54 0h15 M53 83h23m54 0h15" />
    </g>
  }
  return <g className={styles.drawing}>
    <ellipse cx="91" cy="47" rx="35" ry="10" />
    <path d="M56 47v40c0 5.5 16 10 35 10s35-4.5 35-10V47 M56 61c0 5.5 16 10 35 10s35-4.5 35-10 M56 74c0 5.5 16 10 35 10s35-4.5 35-10" />
  </g>
}

export function RequestCrossSection({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  const { language, text: { flow } } = useLanguage()
  const text = copy[language]
  const sequence = useRef<HTMLDivElement>(null)
  const [picked, setPicked] = useState<Layer | null>(null)
  const wide = useSyncExternalStore(subscribe, supportsAnimatedScene, () => false)
  const animated = wide && !expanded
  const detailId = useId()
  const still = useMotionValue(1)

  return (
    <div ref={sequence} className={styles.sequence} data-request-cross-section="" data-animated={animated || undefined}>
      <div className={styles.frame}>
        {children}
        {!expanded && <figure className={styles.figure} aria-label={text.label}>
          <div className={styles.surface}>
            {animated ? <AnimatedLayers target={sequence} selected={picked} /> : <Layers progress={still} selected={picked} />}
            <CompactLayers selected={picked} />
            <div className={styles.legend} aria-hidden="true">
              <span className={styles.legendRule}>{text.request} <span>→</span></span>
              <span className={styles.legendRule} data-response="true"><span>←</span> {text.response}</span>
            </div>
          </div>
          <figcaption className={styles.caption}>
            <p className="visually-hidden">{text.route}</p>
            <ul className={styles.layers}>
              {layers.map(layer => (
                <li key={systems[layer].id}>
                  <button type="button" aria-expanded={picked === layer} aria-controls={detailId}
                    onClick={() => setPicked(current => current === layer ? null : layer)}>
                    <span aria-hidden="true">0{layer + 1}</span>{flow.systems[layer].name}
                  </button>
                </li>
              ))}
            </ul>
            <div id={detailId} className={styles.detail} aria-live="polite">
              <p aria-hidden={picked !== null} data-current={picked === null ? '' : undefined}>{text.hint}</p>
              {layers.map(layer => (
                <p key={systems[layer].id} aria-hidden={picked !== layer} data-current={picked === layer ? '' : undefined}>
                  {flow.systems[layer].role}
                </p>
              ))}
            </div>
          </figcaption>
        </figure>}
      </div>
    </div>
  )
}
