import './Contact.css'
import { useLanguage } from '../../i18n/language'

const githubUrl = 'https://github.com/srdjan7991-sudo'

export function Contact() {
  const { text } = useLanguage()
  return (
    <section id="contact" className="contact-section" aria-labelledby="contact-title" tabIndex={-1}>
      <div className="container contact-inner">
        <div className="contact-copy">
          <p className="contact-signature">Srdjan Pajic</p>
          <h2 id="contact-title" className="section-title">{text.sections.contact.title}</h2>
          <p className="contact-description">{text.contact.description}</p>
        </div>
        <ul className="contact-links">
          <li><a className="ui-pill ui-pill--accent" href="mailto:srdjan.7991@gmail.com">{text.contact.email} <span className="contact-arrow" aria-hidden="true">↗</span></a></li>
          <li><a className="ui-pill" href="https://www.linkedin.com/in/srdjan-pajic-6a8911281/" target="_blank" rel="noopener noreferrer">LinkedIn <span className="contact-arrow" aria-hidden="true">↗</span></a></li>
          <li><a className="ui-pill" href={githubUrl} target="_blank" rel="noopener noreferrer">GitHub <span className="contact-arrow" aria-hidden="true">↗</span></a></li>
          <li><a className="ui-pill" href={`${import.meta.env.BASE_URL}Srdjan_Pajic_CV.docx`} download>{text.contact.cv} <span className="contact-file-type">({text.contact.cvLanguage}, DOCX)</span> <span className="contact-arrow" aria-hidden="true">↓</span></a></li>
        </ul>
      </div>
    </section>
  )
}
