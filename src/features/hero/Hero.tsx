import { useRef } from 'react'
import { useLanguage } from '../../i18n/language'
import { HeroPhoto } from './HeroPhoto'
import { useHeroEntrance } from './useHeroEntrance'
import './Hero.css'

export function Hero() {
  const { text: { hero } } = useLanguage()
  const section = useRef<HTMLElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  useHeroEntrance(section, visual)

  return (
    <section id="top" className="hero" aria-labelledby="intro-title" ref={section}>
      <div className="hero-content container">
        <div className="hero-copy">
          <h1 id="intro-title" className="hero-title">
            <span className="hero-title-line hero-title-primary">{hero.first}</span>{' '}
            <em className="hero-title-line hero-title-secondary">{hero.second}</em>
          </h1>
          <p className="hero-lead">{hero.description}</p>
          <div className="hero-actions">
            <a className="hero-work ui-pill ui-pill--accent" href="#work">
              <span>{hero.work}</span>
              <span className="hero-arrow" aria-hidden="true">↓</span>
            </a>
            <a className="hero-contact" href="#contact">
              <span className="hero-contact-label">{hero.contact}</span>
              <span className="hero-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <HeroPhoto frameRef={visual} />
      </div>
    </section>
  )
}
