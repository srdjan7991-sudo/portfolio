import { useLanguage } from '../../i18n/language'
import { HeroArchitecture } from './HeroArchitecture'
import './Hero.css'

export function Hero() {
  const { text: { hero } } = useLanguage()
  return (
    <section id="top" className="hero" aria-labelledby="intro-title">
      <div className="container">
        <div className="hero-intro">
          <h1 id="intro-title" className="hero-title">
            <span>{hero.first}</span>{' '}
            <em>{hero.second}</em>
          </h1>
          <div>
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
        </div>
      </div>
      <HeroArchitecture />
    </section>
  )
}
