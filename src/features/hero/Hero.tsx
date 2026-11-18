import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'

import limestoneSmall from '../../assets/hero-limestone-480.webp'
import limestoneLarge from '../../assets/hero-limestone-960.webp'
import './Hero.css'
import { useLanguage } from '../../i18n/language'

const headlineSpring = { type: 'spring', stiffness: 155, damping: 25 } as const
const detailEase = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const { text: { hero } } = useLanguage()
  const reduceMotion = useReducedMotion()
  const hiddenLine = reduceMotion ? false : { opacity: 0.68, y: 18 }
  const visibleLine = { opacity: 1, y: 0 }
  const hiddenDetail = reduceMotion ? false : { opacity: 0.8, y: 8 }

  return (
    <LazyMotion features={domAnimation} strict>
      <section id="top" className="hero" aria-labelledby="intro-title">
        <div className="hero-content container">
          <div className="hero-copy">
            <h1 id="intro-title" className="hero-title">
              <m.span initial={hiddenLine} animate={visibleLine} transition={headlineSpring}>
                {hero.first}
              </m.span>{' '}
              <m.em initial={hiddenLine} animate={visibleLine} transition={{ ...headlineSpring, delay: 0.08 }}>
                {hero.second}
              </m.em>
            </h1>
            <m.p
              className="hero-lead"
              initial={hiddenDetail}
              animate={visibleLine}
              transition={{ duration: 0.46, delay: 0.16, ease: detailEase }}
            >
              {hero.description}
            </m.p>
            <m.div
              className="hero-actions"
              initial={hiddenDetail}
              animate={visibleLine}
              transition={{ duration: 0.46, delay: 0.22, ease: detailEase }}
            >
              <a className="hero-work ui-pill ui-pill--accent" href="#work">
                <span>{hero.work}</span>
                <span className="hero-arrow" aria-hidden="true">↓</span>
              </a>
              <a className="hero-contact" href="#contact">
                <span>{hero.contact}</span>
                <span className="hero-arrow" aria-hidden="true">↗</span>
              </a>
            </m.div>
          </div>
          <m.div
            className="hero-visual"
            initial={reduceMotion ? false : { opacity: 0.82, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: detailEase }}
            aria-hidden="true"
          >
            <img
              src={limestoneLarge}
              srcSet={`${limestoneSmall} 480w, ${limestoneLarge} 960w`}
              sizes="(max-width: 47.5rem) calc(100vw - clamp(2.5rem, 9.6vw, 9rem)), (max-width: 87.5rem) 36vw, 511px"
              width={960}
              height={1200}
              fetchPriority="high"
              alt=""
            />
          </m.div>
        </div>
      </section>
    </LazyMotion>
  )
}
