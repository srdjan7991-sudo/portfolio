import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'

import './Hero.css'

const headlineEase = [0.16, 1, 0.3, 1] as const
const detailEase = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const reduceMotion = useReducedMotion()
  const hiddenLine = reduceMotion ? false : { y: '108%' }
  const visibleLine = { y: '0%' }
  const hiddenDetail = reduceMotion ? false : { opacity: 0, y: 14 }
  const visibleDetail = { opacity: 1, y: 0 }

  return (
    <LazyMotion features={domAnimation} strict>
      <section id="top" className="hero" aria-labelledby="intro-title">
        <div className="hero-content">
          <h1 id="intro-title" className="hero-title">
            <span className="hero-line">
              <m.span
                initial={hiddenLine}
                animate={visibleLine}
                transition={{ duration: 0.88, ease: headlineEase }}
              >
                Frontend-focused
              </m.span>
            </span>{' '}
            <span className="hero-line">
              <m.em
                initial={hiddenLine}
                animate={visibleLine}
                transition={{ duration: 0.98, delay: 0.12, ease: headlineEase }}
              >
                Software Engineer
              </m.em>
            </span>
          </h1>
          <m.p
            className="hero-lead"
            initial={hiddenDetail}
            animate={visibleDetail}
            transition={{ duration: 0.54, delay: 0.38, ease: detailEase }}
          >
            I build web applications with React, TypeScript, and JavaScript.
            I have over five years of professional experience in software development.
          </m.p>
          <div className="hero-actions">
            <m.a
              className="hero-work"
              href="#work"
              initial={reduceMotion ? false : { '--entrance': 12 }}
              animate={{ '--entrance': 0 }}
              transition={{ duration: 0.55, delay: 0.48, ease: detailEase }}
            >
              <span>View selected work</span>
              <span className="hero-arrow" aria-hidden="true">↓</span>
            </m.a>
            <m.a
              className="hero-contact"
              href="#contact"
              initial={reduceMotion ? false : { '--entrance': 12 }}
              animate={{ '--entrance': 0 }}
              transition={{ duration: 0.55, delay: 0.57, ease: detailEase }}
            >
              <span>Get in touch</span>
              <span className="hero-arrow" aria-hidden="true">↗</span>
            </m.a>
          </div>
        </div>
      </section>
    </LazyMotion>
  )
}
