import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/language'
import type { Language } from '../../i18n/language'

type Outcome = 'success' | 'error'
type Request = { phase: 'idle' } | { phase: 'loading'; outcome: Outcome } | { phase: Outcome }
type Phase = Request['phase']

const stages = ['ready', 'loading', 'response'] as const
const simulationDelay = 750
const responseCodes = { success: 200, error: 503 }

type RequestCopy = {
  simulation: string
  lifecycle: string
  stages: Record<(typeof stages)[number], string>
  statuses: Record<Phase, { title: string; detail: string }>
  controls: Record<Outcome | 'reset', string>
}

const requestCopy = {
  en: {
    simulation: 'Simulated request',
    lifecycle: 'Request lifecycle',
    stages: { ready: 'Ready', loading: 'Loading', response: 'Response' },
    statuses: {
      idle: { title: 'Ready to send', detail: 'Choose an outcome to run the simulation.' },
      loading: { title: 'Waiting for a response', detail: 'The simulated request is in progress.' },
      success: { title: 'Request succeeded', detail: 'Three sample records are available to display.' },
      error: { title: 'Request failed', detail: 'The service is unavailable. You can try again.' },
    },
    controls: { success: 'Simulate success', error: 'Simulate error', reset: 'Reset' },
  },
  sr: {
    simulation: 'Simulirani zahtev',
    lifecycle: 'Životni ciklus zahteva',
    stages: { ready: 'Spremno', loading: 'Učitavanje', response: 'Odgovor' },
    statuses: {
      idle: { title: 'Spremno za slanje', detail: 'Izaberi ishod da pokreneš simulaciju.' },
      loading: { title: 'Čekanje na odgovor', detail: 'Simulirani zahtev je u toku.' },
      success: { title: 'Zahtev je uspeo', detail: 'Tri probna zapisa su spremna za prikaz.' },
      error: { title: 'Zahtev nije uspeo', detail: 'Servis nije dostupan. Pokušaj ponovo.' },
    },
    controls: { success: 'Simuliraj uspeh', error: 'Simuliraj grešku', reset: 'Vrati na početak' },
  },
} satisfies Record<Language, RequestCopy>

export function RequestDemo() {
  const { language } = useLanguage()
  const copy = requestCopy[language]
  const [request, setRequest] = useState<Request>({ phase: 'idle' })
  const { phase } = request
  const activeStage = phase === 'idle' ? 0 : phase === 'loading' ? 1 : 2
  const status = copy.statuses[phase]
  const code = phase === 'success' || phase === 'error' ? responseCodes[phase] : null

  useEffect(() => {
    if (request.phase !== 'loading') return

    const timeout = window.setTimeout(() => {
      setRequest((current) => current === request ? { phase: request.outcome } : current)
    }, simulationDelay)

    return () => window.clearTimeout(timeout)
  }, [request])

  function run(outcome: Outcome) {
    setRequest((current) => current.phase === 'loading' ? current : { phase: 'loading', outcome })
  }

  function reset() {
    setRequest((current) => current.phase === 'idle' ? current : { phase: 'idle' })
  }

  return (
    <div className="engineer-request">
      <div className="engineer-request-header">
        <code>GET /sample-records</code>
        <span>{copy.simulation}</span>
      </div>
      <ol className="engineer-request-stages" aria-label={copy.lifecycle}>
        {stages.map((stage, index) => (
          <li
            key={stage}
            aria-current={index === activeStage ? 'step' : undefined}
            data-stage={index < activeStage ? 'complete' : index === activeStage ? 'current' : 'upcoming'}
          >
            {copy.stages[stage]}
          </li>
        ))}
      </ol>
      <output className="engineer-request-reading" data-phase={phase}>
        <span className="engineer-request-reading-value">
          <strong>{status.title}</strong>
          {code && <code>HTTP {code}</code>}
        </span>
        <span className="engineer-request-detail">{status.detail}</span>
      </output>
      <div className="engineer-request-controls">
        <button
          className="engineer-demo-button"
          type="button"
          aria-disabled={phase === 'loading'}
          onClick={() => run('success')}
        >
          {copy.controls.success}
        </button>
        <button
          className="engineer-demo-button"
          type="button"
          aria-disabled={phase === 'loading'}
          onClick={() => run('error')}
        >
          {copy.controls.error}
        </button>
        <button
          className="engineer-demo-button"
          type="button"
          aria-disabled={phase === 'idle'}
          onClick={reset}
        >
          {copy.controls.reset}
        </button>
      </div>
    </div>
  )
}
