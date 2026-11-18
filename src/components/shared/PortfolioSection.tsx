import type { ReactNode } from 'react'
import { useLanguage } from '../../i18n/language'
import type { SectionKey } from '../../sections'

type Props = {
  id: SectionKey
  intro?: string
  children: ReactNode
}

export function PortfolioSection({ id, intro, children }: Props) {
  const { text } = useLanguage()
  const headingId = `${id}-title`
  return (
    <section id={id} className="container portfolio-section" aria-labelledby={headingId} tabIndex={-1}>
      <h2 id={headingId} className="section-title">{text.sections[id].title}</h2>
      {intro && <p className="section-intro">{intro}</p>}
      {children}
    </section>
  )
}
