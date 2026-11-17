import styles from './Portfolio.module.css'

const links = [
  { href: '#work', label: 'Work' },
  { href: '#experience', label: 'Experience' },
  { href: '#skills', label: 'Skills' },
  { href: '#contact', label: 'Contact' },
]

export const githubUrl = 'https://github.com/srdjan7991-sudo'

export function Header() {
  return (
    <header className={styles.header} id="top">
      <div className={`container ${styles.headerInner}`}>
        <a className={styles.brand} href="#top">Srdjan Pajic</a>
        <nav aria-label="Main navigation" className={styles.nav}>
          {links.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}
        </nav>
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
