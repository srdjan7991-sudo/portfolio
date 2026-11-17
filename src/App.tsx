import './components/shared/Section.css'
import { Header, Footer } from './components/shared/Layout'
import { Contact } from './features/contact/Contact'
import { EducationCertifications } from './features/education-certifications/EducationCertifications'
import { EngineeringExpertise } from './features/engineering-expertise/EngineeringExpertise'
import { Hero } from './features/hero/Hero'
import { ProfessionalExperience } from './features/professional-experience/ProfessionalExperience'
import { SelectedWork } from './features/selected-work/SelectedWork'
import { TechnicalSkills } from './features/technical-skills/TechnicalSkills'
import { useSectionNavigation } from './hooks/sectionNavigation'

export function App() {
  useSectionNavigation()

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <SelectedWork />
        <TechnicalSkills />
        <EngineeringExpertise />
        <ProfessionalExperience />
        <EducationCertifications />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
