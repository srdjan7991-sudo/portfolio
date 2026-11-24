import { PortfolioSection } from '../../components/shared/PortfolioSection'
import './EducationCertifications.css'
import { useLanguage } from '../../i18n/language'

const courseNames = ['Claude Code in Action', 'AI Fluency for Builders', 'Introduction to Model Context Protocol']
const courseLists = {
  en: new Intl.ListFormat('en', { type: 'conjunction' }).formatToParts(courseNames),
  sr: new Intl.ListFormat('sr-Latn', { type: 'conjunction' }).formatToParts(courseNames),
}

export function EducationCertifications() {
  const { language, text: { education } } = useLanguage()
  return (
    <PortfolioSection id="education">
      <ul className="education-credentials">
        <li>
          <time dateTime="2018">2018</time>
          <h3 lang="en">Certified Software Engineering Professional</h3>
          <p>ITAcademy · {education.location}</p>
        </li>
        <li>
          <time dateTime="2026-08">{education.date}</time>
          <h3>{education.courses}</h3>
          <p>{courseLists[language].map(({ type, value }) => type === 'element'
            ? <span key={value} lang="en">{value}</span> : value)}</p>
        </li>
      </ul>
    </PortfolioSection>
  )
}
