import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PortfolioSection } from '../../components/shared/PortfolioSection'
import { useLanguage } from '../../i18n/language'
import { EngineeringWorkspace } from './EngineeringWorkspace'
import { engineeringAreaIds, engineeringAreas, engineeringTools } from './engineeringAreas'
import type { EngineeringArea } from './engineeringAreas'
import './EngineeringExpertise.css'

const layoutTransition = { duration: 0.36, ease: [0.22, 1, 0.36, 1] } as const
const previewExit = { duration: 0.17, ease: 'easeOut' } as const

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotion(change: () => void) {
  const media = window.matchMedia?.(reducedMotionQuery)
  media?.addEventListener('change', change)
  return () => media?.removeEventListener('change', change)
}

function getReducedMotion() {
  return window.matchMedia?.(reducedMotionQuery).matches ?? false
}

function focusVisibleTarget(target: HTMLElement | null | undefined) {
  if (!target) return
  target.focus({ preventScroll: true })
  // A previous native focus change can leave a smooth scroll aimed at the old view.
  const scroller = document.scrollingElement
  scroller?.scrollTo({ top: scroller.scrollTop, behavior: 'instant' })
  // The parent is in its final layout even while Motion projects the focused control.
  const anchor = target.parentElement ?? target
  const { top } = anchor.getBoundingClientRect()
  const bottom = top + target.offsetHeight
  const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0
  if (top < scrollPadding || bottom > window.innerHeight) {
    anchor.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
}

export function EngineeringExpertise() {
  const { text: { expertise } } = useLanguage()
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion)
  const [area, setArea] = useState<EngineeringArea | null>(null)
  const [focusedArea, setFocusedArea] = useState<EngineeringArea | null>(null)
  const [hoveredArea, setHoveredArea] = useState<EngineeringArea | null>(null)
  const previousArea = useRef<EngineeringArea | null>(null)
  const areaButtons = useRef<Partial<Record<EngineeringArea, HTMLButtonElement | null>>>({})
  const areaHeading = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    const previous = previousArea.current
    previousArea.current = area
    if (area) focusVisibleTarget(areaHeading.current)
    else if (previous) focusVisibleTarget(areaButtons.current[previous])
  }, [area])

  const activeArea = area ? expertise.areas[area] : null
  const preview = hoveredArea ?? focusedArea ?? engineeringAreaIds[0]

  return (
    <LayoutGroup id="how-i-engineer">
      <PortfolioSection id="expertise" intro={expertise.intro}>
        <div className="engineer" data-view={area ? 'area' : 'index'}>
          <nav className="engineer-index" aria-label={expertise.areasLabel}>
            <ul>
              {engineeringAreaIds.map(id => (
                <li key={id}>
                  <motion.button
                    ref={element => { areaButtons.current[id] = element }}
                    layout={reducedMotion ? false : 'position'}
                    transition={layoutTransition}
                    type="button"
                    aria-current={area === id ? 'true' : undefined}
                    aria-controls="engineer-explore"
                    data-preview={!area && preview === id}
                    onFocus={() => { setFocusedArea(id); setHoveredArea(null) }}
                    onBlur={() => setFocusedArea(null)}
                    onPointerEnter={event => { if (!area && event.pointerType === 'mouse') setHoveredArea(id) }}
                    onPointerLeave={() => setHoveredArea(null)}
                    onClick={() => { setHoveredArea(null); setArea(id) }}
                  >
                    <motion.span className="engineer-index-name"
                      layoutId={!reducedMotion && !area ? `engineer-area-${id}` : undefined}>
                      {expertise.areas[id].title}
                    </motion.span>
                    <span className="engineer-index-description">{expertise.areas[id].description}</span>
                    <span className="engineer-index-arrow" aria-hidden="true">→</span>
                  </motion.button>
                </li>
              ))}
            </ul>
          </nav>
          <div id="engineer-explore" className="engineer-explore" hidden={!area}>
            {area && activeArea && (
              <>
                <button className="engineer-back" type="button" onClick={() => setArea(null)}>
                  <span aria-hidden="true">←</span> {expertise.back}
                </button>
                <div className="engineer-area" key={area}>
                  <header className="engineer-area-header">
                    <motion.h3 layoutId={reducedMotion ? undefined : `engineer-area-${area}`}
                      transition={layoutTransition} tabIndex={-1} ref={areaHeading}>
                      {activeArea.title}
                    </motion.h3>
                    <p>{activeArea.description}</p>
                  </header>
                  <EngineeringWorkspace area={area} />
                  <p className="engineer-evidence"><strong>{expertise.work}</strong> {activeArea.evidence}</p>
                  <p className="engineer-tools"><strong>{expertise.tools}</strong> {engineeringTools[area].join(' · ')}</p>
                </div>
              </>
            )}
          </div>
          <AnimatePresence mode="popLayout">
            {!area && (
              <motion.div key="preview" className="engineer-preview" aria-hidden="true"
                initial={reducedMotion ? false : { opacity: 0.65 }} animate={{ opacity: 1 }}
                exit={reducedMotion ? { opacity: 1 } : { opacity: 0 }} transition={reducedMotion ? { duration: 0 } : previewExit}>
                <div className="engineer-preview-inner" key={preview}>
                  <p className="engineer-label">{expertise.areas[preview].title}</p>
                  <ul>
                    {engineeringAreas[preview].map(concept => (
                      <li key={concept}>{expertise.concepts[concept].title}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PortfolioSection>
    </LayoutGroup>
  )
}
