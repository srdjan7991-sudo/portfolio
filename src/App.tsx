import './components/shared/Section.css'
import { Header, Footer } from './components/shared/Layout'
import { Contact } from './features/contact/Contact'
import { AuthControl } from './features/auth/AuthControl'
import type { AuthPresentation } from './features/auth/AuthControl'
import { EducationCertifications } from './features/education-certifications/EducationCertifications'
import { EngineeringExpertise } from './features/engineering-expertise/EngineeringExpertise'
import { Hero } from './features/hero/Hero'
import { ProfessionalExperience } from './features/professional-experience/ProfessionalExperience'
import { RequestFlow } from './features/request-flow/RequestFlow'
import { SelectedWork } from './features/selected-work/SelectedWork'
import { TechnicalSkills } from './features/technical-skills/TechnicalSkills'
import { PortfolioSections } from './features/section-order/PortfolioSections'
import { useSectionOrder } from './features/section-order/useSectionOrder'
import { ThemeSwitch } from './features/theme/ThemeSwitch'
import { useTheme } from './features/theme/useTheme'
import { useSectionNavigation } from './hooks/sectionNavigation'
import { LanguageProvider, useLanguage } from './i18n/language'
import { LanguageSwitch } from './i18n/LanguageSwitch'

const sections = {
  work: <SelectedWork />, skills: <TechnicalSkills />, expertise: <EngineeringExpertise />,
  experience: <ProfessionalExperience />, education: <EducationCertifications />, contact: <Contact />,
}

export function App() {
  return <LanguageProvider><PortfolioApp /></LanguageProvider>
}

function PortfolioApp() {
  const { text } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const authEnabled = location.protocol === 'https:' &&
    (import.meta.env.DEV || import.meta.env.VITE_PORTFOLIO_AUTH_ENABLED === 'true')
  const sectionOrder = useSectionOrder(authEnabled)
  useSectionNavigation(sectionOrder.ready)

  function renderPortfolio({ control, toolbar, editToken }: Partial<AuthPresentation>) {
    return (
      <>
        <a className="skip-link" href="#main">{text.layout.skip}</a>
        <Header auth={control} adminToolbar={toolbar} sectionOrder={sectionOrder.order} languageControl={<LanguageSwitch />}
          themeControl={<ThemeSwitch theme={theme} onToggle={toggleTheme} />} />
        <main id="main" tabIndex={-1}>
          <Hero />
          <RequestFlow live={authEnabled} />
          <PortfolioSections sections={sections} order={sectionOrder.order} saving={sectionOrder.saving}
            editing={Boolean(editToken) && sectionOrder.ready}
            onPreview={sectionOrder.preview} onCancel={sectionOrder.cancel}
            onSave={() => { if (editToken) void sectionOrder.save(editToken) }} />
        </main>
        <Footer />
      </>
    )
  }

  return authEnabled ? (
    <AuthControl orderStatus={sectionOrder.ready ? sectionOrder.status : text.order.status.loading}>
      {renderPortfolio}
    </AuthControl>
  ) : renderPortfolio({})
}
