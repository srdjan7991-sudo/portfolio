import { Header, Footer } from './Layout'
import { Contact, Experience, Introduction, SelectedWork, Skills } from './Sections'

export function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Introduction />
        <SelectedWork />
        <Experience />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
