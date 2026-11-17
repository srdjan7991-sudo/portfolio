import './EducationCertifications.css'

export function EducationCertifications() {
  return (
    <section id="education" className={`container portfolio-section`} aria-labelledby="education-title" tabIndex={-1}>
      <h2 id="education-title" className="section-title">Education &amp; Certifications</h2>
      <ul className="education-credentials">
        <li><h3>Certified Software Engineering Professional</h3><p>ITAcademy · Belgrade, Serbia · 2018</p></li>
        <li><h3>Selected Anthropic courses</h3><p>Claude Code in Action, AI Fluency for Builders, and Introduction to Model Context Protocol · August 2026</p></li>
      </ul>
    </section>
  )
}
