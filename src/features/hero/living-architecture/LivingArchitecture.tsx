import { useRef } from 'react'
import { useLanguage } from '../../../i18n/language'
import { ArchitectureStill } from './ArchitectureStill'
import { useArchitectureScene } from './useArchitectureScene'
import styles from './LivingArchitecture.module.css'

const copy = {
  en: {
    eyebrow: 'The System Unfolds',
    title: 'Living Architecture',
    description: 'From storage and services to the interface you use.',
    hint: 'Scroll to unfold',
    skip: 'Explore the interface',
    phases: ['Separation', 'Assembly', 'Connection', 'Perspective', 'Transformation'],
  },
  sr: {
    eyebrow: 'Sistem se razvija',
    title: 'Živa arhitektura',
    description: 'Od podataka i servisa do interfejsa koji koristiš.',
    hint: 'Skroluj kroz faze',
    skip: 'Istraži interfejs',
    phases: ['Razdvajanje', 'Sastavljanje', 'Povezivanje', 'Perspektiva', 'Transformacija'],
  },
} as const

export function LivingArchitecture() {
  const track = useRef<HTMLDivElement>(null)
  const { language } = useLanguage()
  const text = copy[language]
  useArchitectureScene(track)

  return (
    <div ref={track} className={`container container--wide ${styles.track}`}
      data-living-architecture data-renderer="static" data-phase="0">
      <div className={styles.stage} data-architecture-stage>
        <div className={styles.art} aria-hidden="true">
          <ArchitectureStill />
          <canvas className={styles.canvas} data-architecture-canvas />
        </div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{text.eyebrow}</p>
          <h2>{text.title}</h2>
          <p className={styles.description}>{text.description}</p>
          <p className={styles.hint}><span aria-hidden="true">↓</span> {text.hint}</p>
        </div>
        <div className={styles.footer}>
          <div className={styles.phase} aria-hidden="true">
            <span className={styles.phaseName}>
              {text.phases.map((label, index) => <span key={label} data-architecture-step={index}>{label}</span>)}
            </span>
            <span className={styles.meter} />
          </div>
          <a className={styles.interfaceLink} href="#living-application">
            {text.skip}<span aria-hidden="true"> ↘</span>
          </a>
        </div>
      </div>
    </div>
  )
}
