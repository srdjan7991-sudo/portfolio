import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { RequestFlowDiagram } from './RequestFlowDiagram'
import { steps } from './requestFlowSteps'
import { useRequestFlow } from './useRequestFlow'
import { useLanguage } from '../../i18n/language'
import { en } from '../../i18n/en'
import { sr } from '../../i18n/sr'
import styles from './RequestFlow.module.css'

// Reserve enough space for both languages without resetting the animation on a switch.
const flows = [en.flow, sr.flow]
const titles = flows.flatMap(flow => flow.phases.map(phase => phase.title))
const descriptions = flows.flatMap(flow => flow.phases.map(phase => phase.description))
const explanations = flows.flatMap(flow => flow.phases.map(phase => phase.explanation))
const liveTitles = [...titles, ...flows.flatMap(flow => [flow.failedTitle, flow.pendingTitle, flow.failedLookup])]
const liveDescriptions = [...descriptions, ...flows.flatMap(flow => [flow.failedDescription, flow.pendingDescription])]
const playLabels = flows.flatMap(flow => [flow.play, flow.pause])
const playerTitles = flows.map(flow => flow.player)
const liveModeDescriptions = flows.map(flow => flow.liveDescription)
const guidedModeDescriptions = flows.map(flow => flow.guidedDescription)

function PhaseText({ text, variants }: { text: string; variants: readonly string[] }) {
  return (
    <span className={styles.phaseText}>
      <span>{text}</span>
      {variants.map(variant => <span key={variant} aria-hidden="true" data-reserve={variant} />)}
    </span>
  )
}

export function RequestFlowPlayer({ active, live }: { active: boolean; live: boolean }) {
  const { text: { flow } } = useLanguage()
  const run = useRequestFlow(active, live)
  const heading = useRef<HTMLHeadingElement>(null)
  const phase = flow.phases[run.index]
  const started = run.result.kind !== 'idle'
  const hasResult = run.index === steps.length - 1
  const failed = run.result.kind === 'error'
  const waiting = hasResult && run.result.kind === 'pending'
  const title = hasResult && failed ? flow.failedTitle : waiting ? flow.pendingTitle
    : failed && run.index === 3 ? flow.failedLookup : phase.title
  const description = hasResult && failed ? flow.failedDescription : waiting ? flow.pendingDescription : phase.description

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'start' })
  }, [])

  return (
    <div className={styles.player}>
      <div className={styles.playerHeading}>
        <div>
          <p className={styles.eyebrow}>{flow.name}</p>
          <h3 ref={heading} tabIndex={-1}><PhaseText text={flow.player} variants={playerTitles} /></h3>
        </div>
        <div className={styles.mode}>
          <strong>{live ? flow.live : flow.guided}</strong>
          <p><PhaseText text={live ? flow.liveDescription : flow.guidedDescription}
            variants={live ? liveModeDescriptions : guidedModeDescriptions} /></p>
        </div>
      </div>
      <fieldset className={styles.playback} aria-label={flow.controls}>
        <div className={styles.buttons}>
          <button type="button" className="ui-pill ui-pill--accent" onClick={run.toggle} disabled={run.finished}>
            <span className={styles.playIcon} aria-hidden="true">{run.playing ? 'Ⅱ' : '▶'}</span>
            <PhaseText text={run.playing ? flow.pause : flow.play} variants={playLabels} />
          </button>
          <button type="button" className="ui-pill" aria-label={flow.previous}
            onClick={() => run.move(-1)} disabled={!started || run.index === 0}><span aria-hidden="true">←</span></button>
          <button type="button" className="ui-pill" aria-label={flow.next}
            onClick={() => run.move(1)} disabled={!started || hasResult}><span aria-hidden="true">→</span></button>
          <button type="button" className="ui-pill" onClick={run.start} disabled={!started}>
            <span aria-hidden="true">↻</span> {flow.replay}
          </button>
        </div>
        <div className={styles.progress}>
          <span>{String(run.index + 1).padStart(2, '0')} / 06</span>
          <div aria-hidden="true" className={styles.segments}>
            {steps.map((stage, i) => <span key={stage.id} data-progress={i === run.index ? 'current' : i < run.index ? 'past' : undefined} />)}
          </div>
        </div>
      </fieldset>
      <div aria-live="polite" aria-atomic="true" className={styles.chapter}>
        <p className={styles.eyebrow}>{String(run.index + 1).padStart(2, '0')} · {phase.label}</p>
        <h4><PhaseText text={title} variants={live ? liveTitles : titles} /></h4>
        <p><PhaseText text={description} variants={live ? liveDescriptions : descriptions} /></p>
      </div>
      <div style={{ '--phase-duration': steps[run.index].duration + 'ms' } as CSSProperties}>
        <RequestFlowDiagram index={run.index} result={run.result} revision={run.revision} finished={run.finished}
          playing={run.playing} moving={run.playing || run.elapsed > 0} start={run.start} live={live} />
      </div>
      <section className={styles.caption} aria-labelledby="request-flow-explanation">
        <h4 id="request-flow-explanation">{flow.explanation}</h4>
        <p><PhaseText key={run.index} text={phase.explanation} variants={explanations} /></p>
      </section>
    </div>
  )
}
