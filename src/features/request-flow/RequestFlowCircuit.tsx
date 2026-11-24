import type { CSSProperties } from 'react'
import { stepIndex } from './requestFlowSteps'
import type { RequestPhase } from './requestFlowSteps'
import styles from './RequestFlowDiagram.module.css'

export type CircuitFrame = {
  index: number
  revision: number
  started: boolean
  moving: boolean
}

type FillCue = {
  phase: RequestPhase
  start: number
  end: number
  amount?: number
}

export type Channel = {
  name: string
  path: string
  outbound: readonly FillCue[]
  returning?: readonly FillCue[]
}

function CircuitFill({ name, path, cues, reverse, frame }: {
  name: string
  path: string
  cues: readonly FillCue[]
  reverse?: boolean
  frame: CircuitFrame
}) {
  if (!frame.started) return null

  let from = 0
  let previousIndex = -1
  let active: FillCue | undefined
  for (const cue of cues) {
    const index = stepIndex(cue.phase)
    if (index === frame.index) active = cue
    else if (index < frame.index && index > previousIndex) {
      from = cue.amount ?? 1
      previousIndex = index
    }
  }
  const to = active ? active.amount ?? 1 : from
  if (to === 0) return null

  // A negative dash offset grows from the far end of the same path.
  const offset = (amount: number) => (1 - amount) * (reverse ? -1 : 1)
  const style = {
    '--fill-from': offset(from),
    '--fill-to': offset(to),
    '--fill-delay': active?.start ?? 0,
    '--fill-span': active ? active.end - active.start : 0,
  } as CSSProperties

  return (
    <path className={styles.circuitFill} d={path} pathLength={1}
      data-channel={name} data-direction={reverse ? 'return' : 'outbound'}
      data-animate={Boolean(active && frame.moving)} style={style} />
  )
}

export function CircuitChannel({ channel, frame, className }: {
  channel: Channel
  frame: CircuitFrame
  className?: string
}) {
  return (
    <g className={className}>
      <path d={channel.path} />
      <CircuitFill key={frame.revision + '-outbound'} name={channel.name} path={channel.path}
        cues={channel.outbound} frame={frame} />
      {channel.returning && (
        <CircuitFill key={frame.revision + '-return'} name={channel.name} path={channel.path}
          cues={channel.returning} reverse frame={frame} />
      )}
    </g>
  )
}
