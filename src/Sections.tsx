import { githubUrl } from './Layout'
import styles from './Portfolio.module.css'

const skills = [
  { area: 'Frontend', tools: 'React, TypeScript, JavaScript, HTML, CSS, SCSS' },
  { area: 'State, APIs & visualization', tools: 'Redux, Redux Toolkit, REST APIs, Highcharts' },
  { area: 'Testing', tools: 'Vitest, React Testing Library' },
  { area: 'Backend & data', tools: 'C#, ASP.NET Core Web API, Entity Framework Core, SQL Server, PostgreSQL' },
]

export function Introduction() {
  return (
    <section className={`container ${styles.hero}`} aria-labelledby="intro-title">
      <div>
        <p className={styles.eyebrow}>Srdjan Pajic</p>
        <h1 id="intro-title">Frontend <em>Engineer.</em></h1>
        <p className={styles.lead}>
          I work with React and TypeScript and have over five years of professional experience in software development.
        </p>
        <div className={styles.actions}>
          <a className={styles.primary} href="#work">View selected work <span aria-hidden="true">↓</span></a>
          <a className={styles.textLink} href={githubUrl}>GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <aside className={styles.profile} aria-label="Technical focus">
        <p className={styles.eyebrow}>Technical focus</p>
        <ul>
          <li>React &amp; TypeScript</li>
          <li>Data visualization</li>
          <li>Frontend testing</li>
        </ul>
      </aside>
    </section>
  )
}

export function SelectedWork() {
  return (
    <section id="work" className={`container ${styles.section}`} aria-labelledby="work-title">
      <h2 id="work-title">Selected work</h2>
      <div className={styles.workGrid}>
        <article className={styles.professional}>
          <p className={styles.eyebrow}>Professional work</p>
          <h3>Frontend case study</h3>
          <p>A case study will be added once the project details and my contribution are cleared for public sharing.</p>
        </article>
        <article className={styles.showcase}>
          <p className={styles.eyebrow}>Independent project · Planned</p>
          <h3>Time-series explorer</h3>
          <p>A proposed React and TypeScript app for comparing trends across locations and date ranges.</p>
        </article>
      </div>
    </section>
  )
}

export function Experience() {
  return (
    <section id="experience" className={`container ${styles.section} ${styles.split}`} aria-labelledby="experience-title">
      <h2 id="experience-title">Experience</h2>
      <div>
        <h3>5+ years in software development</h3>
        <p>My primary focus is frontend development with React and TypeScript. I also have experience with .NET APIs and relational databases.</p>
      </div>
    </section>
  )
}

export function Skills() {
  return (
    <section id="skills" className={`container ${styles.section} ${styles.split}`} aria-labelledby="skills-title">
      <h2 id="skills-title">Technical skills</h2>
      <dl className={styles.skills}>
        {skills.map(({ area, tools }) => (
          <div key={area}>
            <dt>{area}</dt>
            <dd>{tools}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function Contact() {
  return (
    <section id="contact" className={styles.contact} aria-labelledby="contact-title">
      <div className={`container ${styles.split}`}>
        <h2 id="contact-title">Contact</h2>
        <div>
          <p>I’m interested in frontend engineering roles focused on React and TypeScript.</p>
          <a className={styles.textLink} href={githubUrl}>Find me on GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  )
}
