import { useId } from 'react'
import type { Theme } from './useTheme'
import { useLanguage } from '../../i18n/language'
import styles from './ThemeSwitch.module.css'

export function ThemeSwitch({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const { text } = useLanguage()
  const shadowId = useId()

  return (
    <button className={styles.button} type="button" role="switch" aria-label={text.layout.darkTheme}
      aria-checked={theme === 'dark'} onClick={onToggle}>
      <span className={styles.track} aria-hidden="true">
        <svg className={styles.stars} viewBox="0 0 18 14">
          <path d="M6 2l.65 2.35L9 5l-2.35.65L6 8l-.65-2.35L3 5l2.35-.65L6 2Z" fill="currentColor" />
          <circle cx="12.5" cy="9.5" r="0.9" fill="currentColor" />
        </svg>
        <span className={styles.thumb}>
          <svg className={styles.symbol} viewBox="0 0 24 24">
            <defs>
              <mask id={shadowId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                <rect width="24" height="24" fill="white" />
                <circle className={styles.occlusion} cx="12" cy="12" r="7.6" fill="black" />
              </mask>
            </defs>
            <path className={styles.rays} d="M12 2.5v2m0 15v2M2.5 12h2m15 0h2M5.3 5.3l1.4 1.4m10.6 10.6 1.4 1.4m0-13.4-1.4 1.4M6.7 17.3l-1.4 1.4"
              fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
            <g mask={`url(#${shadowId})`}>
              <circle className={styles.disc} cx="12" cy="12" r="5.6" fill="currentColor" />
              <g className={styles.craters} fill="var(--switch-crater)">
                <circle cx="8.2" cy="12.8" r="0.82" />
                <circle cx="11.1" cy="16.6" r="0.58" />
              </g>
            </g>
          </svg>
        </span>
      </span>
    </button>
  )
}
