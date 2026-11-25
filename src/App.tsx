import type { ComponentProps, ReactNode } from 'react'
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
  return (
    <LanguageProvider>
      <PortfolioApp />
    </LanguageProvider>
  )
}

type ViewProps = Omit<ComponentProps<typeof PortfolioSections>, 'sections'> & {
  auth?: ReactNode
  toolbar?: ReactNode
  orderReady?: boolean
  live?: boolean
}

function PortfolioView({ auth, toolbar, orderReady = true, live = false, ...sectionEditor }: ViewProps) {
  const { text } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  useSectionNavigation(orderReady)
  return (
    <>
      <a className="skip-link" href="#main">{text.layout.skip}</a>
      <Header auth={auth} adminToolbar={toolbar} sectionOrder={sectionEditor.order} languageControl={<LanguageSwitch />}
        themeControl={<ThemeSwitch theme={theme} onToggle={toggleTheme} />} />
      <main id="main" tabIndex={-1}>
        <Hero />
        <RequestFlow live={live} />
        <PortfolioSections sections={sections} {...sectionEditor} />
      </main>
      <Footer />
    </>
  )
}

function PortfolioApp() {
  const { text } = useLanguage()
  const authEnabled = location.protocol === 'https:' &&
    (import.meta.env.DEV || import.meta.env.VITE_PORTFOLIO_AUTH_ENABLED === 'true')
  const sectionOrder = useSectionOrder(authEnabled, () => {
    if (document.activeElement?.matches('[data-section-order-control]')) {
      document.getElementById('portfolio-order-status')?.focus()
    }
  })
  function renderPortfolio({ control, toolbar, editToken, prepareEditTokenRetry }: Partial<AuthPresentation>) {
    return (
      <PortfolioView auth={control} toolbar={toolbar} orderReady={sectionOrder.ready} live={authEnabled}
        order={sectionOrder.order} editing={Boolean(editToken) && sectionOrder.orderLoaded} saving={sectionOrder.saving}
        onPreview={sectionOrder.preview} onCancel={sectionOrder.cancel}
        onSave={() => { if (editToken) void sectionOrder.save(editToken, prepareEditTokenRetry?.()) }} />
    )
  }

  return authEnabled ? (
    <AuthControl editingAvailable={sectionOrder.orderLoaded}
      orderStatus={sectionOrder.ready ? sectionOrder.status : text.order.status.loading}>
      {renderPortfolio}
    </AuthControl>
  ) : renderPortfolio({})
}
