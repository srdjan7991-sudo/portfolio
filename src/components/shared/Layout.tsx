import * as Collapsible from '@radix-ui/react-collapsible'
import { useRef, useState } from 'react'

import header from './Header.module.css'
import styles from './Footer.module.css'
import { sectionLinks, useActiveSection } from '../../hooks/sectionNavigation'

function SectionLinks({ activeSection, onNavigate }: {
  activeSection?: string
  onNavigate?: () => void
}) {
  return sectionLinks.map(({ id, label }) => (
    <a key={id} href={`#${id}`} aria-current={activeSection === id ? 'location' : undefined} onClick={onNavigate}>
      {label}
    </a>
  ))
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const activeSection = useActiveSection(headerRef)

  return (
    <header className={header.header} ref={headerRef}>
      <div className={header.inner}>
        <a className={header.brand} href="#top" onClick={() => setMenuOpen(false)}>
          Srdjan Pajic
        </a>
        <nav aria-label="Main navigation" className={header.desktopNav}>
          <SectionLinks activeSection={activeSection} />
        </nav>
        <Collapsible.Root
          className={header.mobile}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && menuOpen) {
              setMenuOpen(false)
              trigger.current?.focus()
            }
          }}
        >
          <Collapsible.Trigger className={header.trigger} ref={trigger}>
            Menu <span className={header.chevron} aria-hidden="true" />
          </Collapsible.Trigger>
          <Collapsible.Content className={header.panel}>
            <nav aria-label="Main navigation" className={header.mobileNav}>
              <SectionLinks activeSection={activeSection} onNavigate={() => setMenuOpen(false)} />
            </nav>
          </Collapsible.Content>
        </Collapsible.Root>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <span>© Srdjan Pajic</span>
        <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
      </div>
    </footer>
  )
}
