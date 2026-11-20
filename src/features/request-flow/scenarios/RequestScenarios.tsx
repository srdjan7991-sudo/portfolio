import { useId, useRef } from 'react'
import type { CSSProperties, Ref } from 'react'
import { useLanguage } from '../../../i18n/language'
import type { Messages } from '../../../i18n/en'
import { isPending, scenarioIds, transitMs, useRequestScenarios } from './useRequestScenarios'
import type { DemoRequest, Scenario } from './useRequestScenarios'
import styles from './RequestScenarios.module.css'

type Copy = Messages['flow']['scenarios']

const copyKey = { race: 'race', cancel: 'cancelCase', retry: 'retry' } as const satisfies Record<Scenario, keyof Copy>
const slots = [0, 1] as const

function Station({ type, label }: { type: 'browser' | 'server'; label: string }) {
  return (
    <span className={styles.station}>
      <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {type === 'browser' ? <><rect x="2.5" y="4" width="19" height="16" rx="3" /><path d="M3 9h18 M7 6.6h1 M10 6.6h1" /></>
          : <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M6.5 7.5h1 M6.5 16.5h1 M11 7.5h6 M11 16.5h6" /></>}
      </svg>
      {label}
    </span>
  )
}

function RequestLane({ request, index, scenario, copy }: {
  request: DemoRequest | undefined
  index: 0 | 1
  scenario: Scenario
  copy: Copy
}) {
  const phase = request?.phase ?? 'idle'
  const path = scenario === 'race' ? `/demo/report?days=${index === 0 ? 7 : 30}` : '/demo/report'

  return (
    <li className={styles.lane} data-phase={phase} data-response={phase === 'returning' ? request?.status : undefined}>
      <div className={styles.laneMeta}>
        <span className={styles.identifier}>{index === 0 ? '01' : '02'}</span>
        <code>GET {path}</code>
        <span className={styles.phase}><span aria-hidden="true" />{copy.phases[phase]}</span>
      </div>
      <div className={styles.rail} aria-hidden="true">
        <div className={styles.track}>
          <span className={styles.browserPort} />
          <span className={styles.packet}><span>{phase === 'cancelled' ? '×' : phase === 'returning' ? '←' : '→'}</span></span>
          <span className={styles.serverPort} />
        </div>
      </div>
    </li>
  )
}

function Result({ title, value, state, note }: { title: string; value: string; state?: DemoRequest['phase']; note?: string }) {
  return (
    <div className={styles.result} data-result={state}>
      <dt className={styles.meta}>{title}</dt>
      <dd>
        <p className={styles.resultValue}>{value}</p>
        {note && <p className={styles.resultNote}>{note}</p>}
      </dd>
    </div>
  )
}

function RaceResult({ requests, copy }: { requests: readonly DemoRequest[]; copy: Copy }) {
  const [older, newer] = requests
  const latest = newer ?? older
  const arrived = requests.reduce<DemoRequest | undefined>((last, request) => {
    if (request.phase !== 'success' || request.finishedAt === null) return last
    return request.finishedAt > (last?.finishedAt ?? -Infinity) ? request : last
  }, undefined)
  const pending = latest ? copy.loading : copy.empty
  const stale = arrived && arrived.id !== latest?.id
  return (
    <>
      <Result title={copy.race.unguarded} value={arrived ? copy.race.ranges[arrived === older ? 0 : 1] : pending}
        state={stale ? 'error' : arrived ? 'success' : undefined}
        note={arrived ? (stale ? copy.race.stale : copy.race.current) : undefined} />
      <Result title={copy.race.guarded} value={latest?.phase === 'success' ? copy.race.ranges[latest === older ? 0 : 1] : pending}
        state={latest?.phase === 'success' ? 'success' : undefined} note={latest?.phase === 'success' ? copy.race.current : undefined} />
    </>
  )
}

function singleResult(request: DemoRequest | undefined, copy: Copy) {
  if (!request) return copy.empty
  if (isPending(request)) return copy.loading
  if (request.phase === 'success') return copy.reportReady
  return copy.phases[request.phase]
}

function describeRun(scenario: Scenario, requests: readonly DemoRequest[], copy: Copy) {
  const [first, next] = requests
  if (!first) return copy.empty
  const latest = next ?? first
  if (scenario === 'race') {
    if (first.phase === 'success') return copy.race.olderArrived
    if (next?.phase === 'success') return copy.race.newerArrived
    if (!next) return first.phase === 'sending' ? copy.phases.sending : copy.race.waiting
    return copy.phases[next.phase]
  }
  if (latest.phase === 'cancelled') return copy.cancelCase.stopped
  if (scenario === 'cancel' && latest.phase === 'success') return next ? copy.cancelCase.replaced : copy.cancelCase.completed
  if (latest.phase === 'error') return copy.retry.failed
  if (latest.phase === 'success') return copy.retry.succeeded
  return copy.phases[latest.phase]
}

export function RequestScenarios({ active, headingRef }: { active: boolean; headingRef: Ref<HTMLHeadingElement> }) {
  const { text: { flow: { scenarios: copy } } } = useLanguage()
  const run = useRequestScenarios(active)
  const id = useId()
  const diagram = useRef<HTMLDivElement>(null)
  const selected = copy[copyKey[run.scenario]]
  const latest = run.requests.at(-1)

  function runAction(control: HTMLButtonElement, available: boolean, action: () => void) {
    if (!available) return
    if (diagram.current) {
      const header = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0
      const roomAboveControl = control.getBoundingClientRect().top - header - 6
      const hiddenDiagram = diagram.current.getBoundingClientRect().bottom - window.innerHeight
      const offset = Math.min(roomAboveControl, hiddenDiagram)
      if (offset > 0) window.scrollBy({ top: offset, behavior: 'instant' })
    }
    action()
  }

  return (
    <section className={styles.simulator} aria-labelledby={id} data-active={active}>
      <p className={styles.eyebrow}>{copy.simulation}</p>
      <h3 id={id} tabIndex={-1} ref={headingRef}>{copy.title}</h3>
      <p className={styles.introduction}>{copy.introduction}</p>

      <fieldset className={styles.choices}>
        <legend className={styles.meta}>{copy.choose}</legend>
        {scenarioIds.map(option => (
          <label key={option} className={styles.choice}>
            <input type="radio" name={`${id}-scenario`} checked={run.scenario === option} onChange={() => run.select(option)} />
            <span>{copy[copyKey[option]].title}</span>
          </label>
        ))}
      </fieldset>

      <div className={styles.stage} style={{ '--transit': `${transitMs}ms` } as CSSProperties}>
        <p className={styles.instruction}>{selected.instruction}</p>
        <div className={styles.controls}>
          <button type="button" className="ui-pill ui-pill--accent" aria-disabled={!run.canSend}
            onClick={event => runAction(event.currentTarget, run.canSend, run.send)}>{copy.send}</button>
          {run.scenario === 'cancel' && <button type="button" className="ui-pill" aria-disabled={!run.canCancel}
            onClick={event => runAction(event.currentTarget, run.canCancel, run.cancel)}>{copy.cancel}</button>}
          <button type="button" className="ui-pill" aria-disabled={!run.canFollowUp}
            onClick={event => runAction(event.currentTarget, run.canFollowUp, run.followUp)}>{selected.followUp}</button>
          <button type="button" className="ui-pill" aria-disabled={run.canSend} onClick={run.reset}>{copy.reset}</button>
        </div>

        <div key={run.scenario} ref={diagram} className={styles.diagram}>
          <div className={styles.stations}>
            <Station type="browser" label={copy.browser} />
            <Station type="server" label={copy.server} />
          </div>
          {/* oxlint-disable-next-line jsx-a11y/no-redundant-roles -- Preserve list semantics in Safari when markers are hidden. */}
          <ol className={styles.requests} role="list">
            {slots.map(index => <RequestLane key={index} index={index} request={run.requests[index]} scenario={run.scenario} copy={copy} />)}
          </ol>
        </div>

        <div className={styles.readout}>
          <h4>{copy.browserResult}</h4>
          <output className={styles.announcement}>{describeRun(run.scenario, run.requests, copy)}</output>
          <dl className={styles.results} data-compare={run.scenario === 'race'}>
            {run.scenario === 'race' ? <RaceResult requests={run.requests} copy={copy} />
              : <Result title={copy.browser} value={singleResult(latest, copy)} state={latest?.phase} />}
          </dl>
        </div>
      </div>
      <details className={styles.details}>
        <summary>{copy.details}</summary>
        <p>{selected.technical}</p>
      </details>
    </section>
  )
}
