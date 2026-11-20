import * as Collapsible from '@radix-ui/react-collapsible'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import header from './Header.module.css'
import styles from './Footer.module.css'
import { useActiveSection } from '../../hooks/sectionNavigation'
import { defaultSectionOrder } from '../../sections'
import type { SectionKey } from '../../sections'
import { useLanguage } from '../../i18n/language'
import { en } from '../../i18n/en'
import { sr } from '../../i18n/sr'

function SectionLinks({ links, activeSection, onNavigate }: {
  links: readonly SectionKey[]
  activeSection?: string
  onNavigate?: () => void
}) {
  const { text } = useLanguage()
  return links.map(id => (
    <a key={id} href={`#${id}`} aria-current={activeSection === id ? 'location' : undefined} onClick={onNavigate}
      data-label-en={en.sections[id].label} data-label-sr={sr.sections[id].label}>
      <span>{text.sections[id].label}</span>
    </a>
  ))
}

export function Header({ auth, adminToolbar, sectionOrder, themeControl, languageControl, homeTarget = '#top' }: {
  auth?: ReactNode; adminToolbar?: ReactNode; sectionOrder?: readonly string[]; themeControl?: ReactNode
  languageControl?: ReactNode; homeTarget?: string
}) {
  const { text } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(() => window.scrollY > 12)
  const headerRef = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const activeSection = useActiveSection(headerRef, sectionOrder)
  const links = sectionOrder ? [...defaultSectionOrder].sort((a, b) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b))
    : defaultSectionOrder

  useEffect(() => {
    const headerElement = headerRef.current
    if (!menuOpen || !headerElement) return

    function onEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !(event.target instanceof Element) || event.target.closest('dialog')) return
      setMenuOpen(false)
      trigger.current?.focus()
    }
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget
      if (!(next instanceof Node && headerElement.contains(next))) setMenuOpen(false)
    }

    headerElement.addEventListener('keydown', onEscape)
    headerElement.addEventListener('focusout', onFocusOut)
    return () => {
      headerElement.removeEventListener('keydown', onEscape)
      headerElement.removeEventListener('focusout', onFocusOut)
    }
  }, [menuOpen])

  useEffect(() => {
    let wasScrolled: boolean | undefined
    function updateMaterial() {
      const next = window.scrollY > 12
      if (next === wasScrolled) return
      wasScrolled = next
      setScrolled(next)
    }
    const initialFrame = requestAnimationFrame(updateMaterial)
    window.addEventListener('scroll', updateMaterial, { passive: true })
    return () => {
      cancelAnimationFrame(initialFrame)
      window.removeEventListener('scroll', updateMaterial)
    }
  }, [])

  return (
    <header className={header.header} ref={headerRef} data-scrolled={scrolled || undefined}>
      {adminToolbar}
      <div className={header.inner} data-auth={Boolean(auth) || undefined} data-language-control={Boolean(languageControl) || undefined}>
        <a className={header.brand} href={homeTarget} onClick={() => setMenuOpen(false)}>
          Srdjan Pajic
        </a>
        <nav aria-label={text.layout.navigation} className={header.desktopNav}>
          <SectionLinks links={links} activeSection={activeSection} />
        </nav>
        <Collapsible.Root
          className={header.mobile}
          open={menuOpen}
          onOpenChange={setMenuOpen}
        >
          <Collapsible.Trigger className={header.trigger} ref={trigger}>
            {text.layout.menu} <span className={header.chevron} aria-hidden="true" />
          </Collapsible.Trigger>
          <Collapsible.Content className={header.panel}>
            <nav aria-label={text.layout.navigation} className={header.mobileNav}>
              <SectionLinks links={links} activeSection={activeSection} onNavigate={() => setMenuOpen(false)} />
            </nav>
          </Collapsible.Content>
        </Collapsible.Root>
        {(themeControl || languageControl) ? <div className={header.actions}>{themeControl}{languageControl}{auth}</div> : auth}
      </div>
    </header>
  )
}

export function Footer({ homeTarget = '#top' }: { homeTarget?: string }) {
  const { text } = useLanguage()
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <span>© Srdjan Pajic</span>
        <a href={homeTarget}>{text.layout.top} <span aria-hidden="true">↑</span></a>
      </div>
    </footer>
  )
}
