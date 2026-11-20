import { useEffect, useRef, useState } from 'react'
import { RequestFlowPlayer } from './RequestFlowPlayer'
import { systems } from './requestFlowSteps'
import { useLanguage } from '../../i18n/language'
import styles from './RequestFlow.module.css'

function SystemIcon({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true">
      {index === 0 ? (
        <><rect x="4" y="8" width="32" height="24" rx="3" /><path d="M4 15h32 M9 11.5h2 M13 11.5h2 M9 23h12 M9 27h19" /></>
      ) : index === 1 ? (
        <><rect x="6" y="8" width="28" height="10" rx="2" /><rect x="6" y="22" width="28" height="10" rx="2" /><path d="M11 13h2 M11 27h2 M19 13h10 M19 27h10" /></>
      ) : (
        <><ellipse cx="20" cy="10" rx="13" ry="5" /><path d="M7 10v20c0 2.8 5.8 5 13 5s13-2.2 13-5V10 M7 20c0 2.8 5.8 5 13 5s13-2.2 13-5" /></>
      )}
    </svg>
  )
}

export function RequestFlow({ live }: { live: boolean }) {
  const { text: { flow } } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [screen, setScreen] = useState<'intro' | 'player'>('intro')
  const section = useRef<HTMLElement>(null)
  const openButton = useRef<HTMLButtonElement>(null)
  const introTitle = useRef<HTMLHeadingElement>(null)
  const restore = useRef(false)

  useEffect(() => {
    if (expanded) {
      introTitle.current?.focus({ preventScroll: true })
      section.current?.scrollIntoView({ block: 'start' })
    } else if (restore.current) {
      openButton.current?.focus({ preventScroll: true })
      section.current?.scrollIntoView({ block: 'start' })
    }
  }, [expanded])

  function open() {
    restore.current = true
    setScreen('intro')
    setExpanded(true)
  }

  return (
    <section id="request-flow" ref={section} className={styles.section}
      aria-labelledby="request-flow-title" data-expanded={expanded} data-view={screen}>
      <div className="container">
        <div className={styles.teaser}>
          <div>
            <p className={styles.eyebrow}>{flow.eyebrow}</p>
            <h2 id="request-flow-title">{flow.teaser}</h2>
            <p className={styles.lead}>{flow.lead}</p>
          </div>
          <div className={styles.teaserAction}>
            <ol className={styles.route}>
              {systems.map((system, i) => <li key={system.id}><SystemIcon index={i} /><span>{flow.systems[i].name}</span></li>)}
            </ol>
            <p className={styles.stack}>React · ASP.NET Core · SQL Server</p>
            <div className={styles.teaserButton} inert={expanded}>
              <div>
                <button ref={openButton} type="button" className="ui-pill ui-pill--accent"
                  onClick={open} aria-expanded={expanded} aria-controls="request-flow-panel">
                  {flow.open} <span aria-hidden="true">↓</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div id="request-flow-panel" className={styles.expand} inert={!expanded}>
          <div>
            <div className={styles.panel}>
              <button type="button" className={styles.close} onClick={() => setExpanded(false)}>
                <span aria-hidden="true">×</span> {flow.close}
              </button>
              {screen === 'intro' ? (
                <div>
                  <p className={styles.eyebrow}>{flow.name}</p>
                  <h3 ref={introTitle} tabIndex={-1}>{flow.intro}</h3>
                  <p className={styles.lead}>{flow.introDescription}</p>
                  <ol className={styles.systems}>
                    {systems.map((system, i) => (
                      <li key={system.id}>
                        <SystemIcon index={i} />
                        <h4>{flow.systems[i].name}</h4>
                        <p>{flow.systems[i].role}</p>
                        <p className={styles.stack}>{system.stack}</p>
                      </li>
                    ))}
                  </ol>
                  <button type="button" className="ui-pill ui-pill--accent" onClick={() => setScreen('player')}>
                    {flow.show} <span aria-hidden="true">→</span>
                  </button>
                </div>
              ) : <RequestFlowPlayer active={expanded} live={live} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
