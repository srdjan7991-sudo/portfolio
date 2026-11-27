import { useEffect, useRef, useState } from 'react'
import { RequestCrossSection } from './RequestCrossSection'
import { RequestFlowPlayer } from './RequestFlowPlayer'
import { RequestScenarios } from './scenarios/RequestScenarios'
import { systems } from './requestFlowSteps'
import { useLanguage } from '../../i18n/language'
import styles from './RequestFlow.module.css'

type View = 'player' | 'scenarios'
const requestStack = systems.map(system => system.stack).join(' · ')

export function RequestFlow({ live }: { live: boolean }) {
  const { text: { flow } } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [panel, setPanel] = useState<{ view: View; session: number } | null>(null)
  const openButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const panelHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const title = panelHeading.current
    if (expanded && title) {
      const close = closeButton.current
      title.focus({ preventScroll: true })
      const header = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0
      const closeMargin = close ? Number.parseFloat(getComputedStyle(close).scrollMarginBlockStart) || 0 : 0
      const height = close ? title.getBoundingClientRect().bottom - close.getBoundingClientRect().top : 0
      const target = close && header + closeMargin + height <= window.innerHeight ? close : title
      target.scrollIntoView({ block: 'start' })
    } else if (!expanded && openButton.current) {
      openButton.current.focus({ preventScroll: true })
      openButton.current.scrollIntoView({ block: 'center' })
    }
  }, [expanded])

  function open(view: View, button: HTMLButtonElement) {
    openButton.current = button
    setPanel(current => ({ view, session: (current?.session ?? 0) + 1 }))
    setExpanded(true)
  }

  return (
    <section id="request-flow" className={styles.section}
      aria-labelledby="request-flow-title" data-expanded={expanded} data-view={panel?.view}>
      <div className="container">
        <RequestCrossSection expanded={expanded}>
          <div className={styles.teaser}>
            <div>
              <p className={styles.eyebrow}>{flow.eyebrow}</p>
              <h2 id="request-flow-title">{flow.teaser}</h2>
              <p className={styles.lead}>{flow.lead}</p>
            </div>
            <div className={styles.teaserAction}>
              <p className={styles.stack}>{requestStack}</p>
              <div className={styles.teaserButton} inert={expanded}>
                <div>
                  <button type="button" className="ui-pill ui-pill--accent"
                    onClick={event => open('player', event.currentTarget)} aria-expanded={expanded && panel?.view === 'player'} aria-controls="request-flow-panel">
                    {flow.open} <span aria-hidden="true">↓</span>
                  </button>
                  <button type="button" className="ui-pill" onClick={event => open('scenarios', event.currentTarget)}
                    aria-expanded={expanded && panel?.view === 'scenarios'} aria-controls="request-flow-panel">
                    {flow.scenarios.open} <span aria-hidden="true">↓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </RequestCrossSection>
        <div id="request-flow-panel" className={styles.expand} inert={!expanded}>
          <div>
            <div className={styles.panel}>
              <button ref={closeButton} type="button" className={styles.close} onClick={() => setExpanded(false)}>
                <span aria-hidden="true">×</span> {panel?.view === 'scenarios' ? flow.scenarios.close : flow.close}
              </button>
              {panel?.view === 'player' && <RequestFlowPlayer key={panel.session} active={expanded} live={live} headingRef={panelHeading} />}
              {panel?.view === 'scenarios' && <RequestScenarios key={panel.session} active={expanded} headingRef={panelHeading} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
