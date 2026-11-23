import type { ReactNode, Ref } from 'react'
import { useLanguage } from '../../i18n/language'
import type { SectionKey } from '../../sections'

type Props = {
  id: SectionKey
  intro?: string
  customReveal?: boolean
  ref?: Ref<HTMLElement>
  children: ReactNode
}

export function PortfolioSection({ id, intro, customReveal, ref, children }: Props) {
  const { text } = useLanguage()
  const headingId = `${id}-title`
  return (
    <section id={id} className="container portfolio-section" aria-labelledby={headingId} tabIndex={-1}
      data-custom-reveal={customReveal || undefined} ref={ref}>
      <h2 id={headingId} className="section-title">{text.sections[id].title}</h2>
      {intro && <p className="section-intro">{intro}</p>}
      {children}
    </section>
  )
}
