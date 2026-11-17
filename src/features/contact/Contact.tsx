import './Contact.css'

const githubUrl = 'https://github.com/srdjan7991-sudo'

export function Contact() {
  return (
    <section id="contact" className="contact-section" aria-labelledby="contact-title" tabIndex={-1}>
      <div className="container">
        <h2 id="contact-title" className="section-title">Contact</h2>
        <p>I’m interested in frontend engineering roles focused on React and TypeScript.</p>
        <ul className="contact-links">
          <li><a href="mailto:srdjan.7991@gmail.com">Email <span aria-hidden="true">↗</span></a></li>
          <li><a href="https://www.linkedin.com/in/srdjan-pajic-6a8911281/">LinkedIn <span aria-hidden="true">↗</span></a></li>
          <li><a href={githubUrl}>GitHub <span aria-hidden="true">↗</span></a></li>
          <li><a href={`${import.meta.env.BASE_URL}Srdjan_Pajic_CV.docx`} download>Download CV <span className="contact-file-type">(DOCX)</span> <span aria-hidden="true">↓</span></a></li>
        </ul>
      </div>
    </section>
  )
}
