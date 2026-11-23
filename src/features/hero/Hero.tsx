import limestoneSmall from '../../assets/hero-limestone-480.webp'
import limestoneLarge from '../../assets/hero-limestone-960.webp'
import './Hero.css'
import { useLanguage } from '../../i18n/language'

// The portrait crop can fill by height. Its intrinsic width is 80% of its height.
const desktopCoverWidth = 'calc(0.8 * clamp(22rem, min(66svh, 52vw), 38rem))'

export function Hero() {
  const { text: { hero } } = useLanguage()

  return (
    <section id="top" className="hero" aria-labelledby="intro-title">
      <div className="hero-content container">
        <div className="hero-copy">
          <h1 id="intro-title" className="hero-title">
            <span className="hero-title-line hero-title-primary"><span className="hero-title-ink">{hero.first}</span></span>{' '}
            <em className="hero-title-line hero-title-secondary"><span className="hero-title-ink">{hero.second}</span></em>
          </h1>
          <p className="hero-lead">{hero.description}</p>
          <div className="hero-actions">
            <a className="hero-work ui-pill ui-pill--accent" href="#work">
              <span>{hero.work}</span>
              <span className="hero-arrow" aria-hidden="true">↓</span>
            </a>
            <a className="hero-contact" href="#contact">
              <span>{hero.contact}</span>
              <span className="hero-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <img
            src={limestoneLarge}
            srcSet={`${limestoneSmall} 480w, ${limestoneLarge} 960w`}
            sizes={`(max-width: 47.5rem) calc(100vw - clamp(2.5rem, 9.6vw, 9rem)), max(min(33vw, 451px), ${desktopCoverWidth})`}
            width={960}
            height={1200}
            fetchPriority="high"
            alt=""
          />
        </div>
      </div>
    </section>
  )
}
