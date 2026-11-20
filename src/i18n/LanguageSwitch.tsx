import { useLanguage } from './language'
import styles from './LanguageSwitch.module.css'

export function LanguageSwitch() {
  const { language, text, setLanguage } = useLanguage()
  const serbian = language === 'sr'

  return (
    <button type="button" role="switch" aria-label={text.layout.language} aria-checked={serbian} data-language-switch
      className={styles.button} onClick={() => setLanguage(serbian ? 'en' : 'sr')}>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.text} data-selected={!serbian}>EN</span>
        <span className={styles.text} data-selected={serbian}>SR</span>
      </span>
    </button>
  )
}
