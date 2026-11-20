import { PortfolioSection } from '../../components/shared/PortfolioSection'
import './EngineeringExpertise.css'
import { useLanguage } from '../../i18n/language'

export function EngineeringExpertise() {
  const { text: { expertise } } = useLanguage()
  return (
    <PortfolioSection id="expertise">
      <div className="expertise-expertise-grid">
        {Object.entries(expertise).map(([id, { title, text }]) => (
          <div key={id}><h3>{title}</h3><p>{text}</p></div>
        ))}
      </div>
    </PortfolioSection>
  )
}
