import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { RequestFlowDiagram } from './RequestFlowDiagram'
import { stepIndex, steps } from './requestFlowSteps'
import { useRequestFlow } from './useRequestFlow'
import { useLanguage } from '../../i18n/language'
import { en } from '../../i18n/en'
import { sr } from '../../i18n/sr'
import styles from './RequestFlow.module.css'

// Reserve enough space for both languages without resetting the animation on a switch.
const flows = [en.flow, sr.flow]
const phases = flows.flatMap(flow => Object.values(flow.phases))
const titles = phases.map(phase => phase.title)
const descriptions = phases.map(phase => phase.description)
const explanations = phases.map(phase => phase.explanation)
const liveTitles = [...titles, ...flows.flatMap(flow => [flow.failedTitle, flow.pendingTitle, flow.failedLookup])]
const liveMessages = flows.flatMap(flow => [flow.failedDescription, flow.failedLookupDescription, flow.pendingDescription])
const liveDescriptions = [...descriptions, ...liveMessages]
const liveExplanations = [...explanations, ...liveMessages]
const playLabels = flows.flatMap(flow => [flow.play, flow.pause])
const playerTitles = flows.map(flow => flow.player)
const liveModeDescriptions = flows.map(flow => flow.liveDescription)
const guidedModeDescriptions = flows.map(flow => flow.guidedDescription)
const firstDataStep = stepIndex('database')
const totalSteps = String(steps.length).padStart(2, '0')

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
  const playButton = useRef<HTMLButtonElement>(null)
  const replayButton = useRef<HTMLButtonElement>(null)
  const step = steps[run.index]
  const phase = flow.phases[step.id]
  const started = run.result.kind !== 'idle'
  const hasResult = step.id === 'result'
  const failed = run.result.kind === 'error'
  const waiting = run.index >= firstDataStep && run.result.kind === 'pending'
  const showFailure = failed && run.index >= firstDataStep
  const failedLookup = showFailure && step.id === 'database'
  const title = failedLookup ? flow.failedLookup : showFailure ? flow.failedTitle : waiting ? flow.pendingTitle : phase.title
  const outcome = failedLookup ? flow.failedLookupDescription : showFailure ? flow.failedDescription
    : waiting ? flow.pendingDescription : undefined

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'start' })
  }, [])

  function move(direction: -1 | 1, control: HTMLButtonElement) {
    const destination = run.index + direction
    if (document.activeElement === control) {
      // A button that becomes disabled loses focus in the browser.
      if (destination === 0) playButton.current?.focus({ preventScroll: true })
      if (destination === steps.length - 1) replayButton.current?.focus({ preventScroll: true })
    }
    run.move(direction)
  }

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
          <button ref={playButton} type="button" className="ui-pill ui-pill--accent" onClick={run.toggle} disabled={run.finished}>
            <span className={styles.playIcon} aria-hidden="true">{run.playing ? 'Ⅱ' : '▶'}</span>
            <PhaseText text={run.playing ? flow.pause : flow.play} variants={playLabels} />
          </button>
          <button type="button" className="ui-pill" aria-label={flow.previous}
            onClick={event => move(-1, event.currentTarget)} disabled={!started || run.index === 0}><span aria-hidden="true">←</span></button>
          <button type="button" className="ui-pill" aria-label={flow.next}
            onClick={event => move(1, event.currentTarget)} disabled={!started || hasResult}><span aria-hidden="true">→</span></button>
          <button ref={replayButton} type="button" className="ui-pill" onClick={run.start} disabled={!started}>
            <span aria-hidden="true">↻</span> {flow.replay}
          </button>
        </div>
        <div className={styles.progress}>
          <span>{String(run.index + 1).padStart(2, '0')} / {totalSteps}</span>
          <div aria-hidden="true" className={styles.segments}>
            {steps.map((stage, i) => <span key={stage.id} data-progress={i === run.index ? 'current' : i < run.index ? 'past' : undefined} />)}
          </div>
        </div>
      </fieldset>
      <div aria-live="polite" aria-atomic="true" className={styles.chapter}>
        <p className={styles.eyebrow}>{String(run.index + 1).padStart(2, '0')} · {phase.label}</p>
        <h4><PhaseText text={title} variants={live ? liveTitles : titles} /></h4>
        <p><PhaseText text={outcome ?? phase.description} variants={live ? liveDescriptions : descriptions} /></p>
      </div>
      <div style={{ '--phase-duration': `${step.duration}ms` } as CSSProperties}>
        <RequestFlowDiagram index={run.index} result={run.result} revision={run.revision} finished={run.finished}
          playing={run.playing} moving={run.playing || run.elapsed > 0} start={run.start} pause={run.pause} live={live} />
      </div>
      <section className={styles.caption} aria-labelledby="request-flow-explanation">
        <h4 id="request-flow-explanation">{flow.explanation}</h4>
        <p><PhaseText key={run.index} text={outcome ?? phase.explanation} variants={live ? liveExplanations : explanations} /></p>
      </section>
    </div>
  )
}
