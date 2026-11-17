import { TechnologyTags } from '../../components/shared/TechnologyTags'
import './ProfessionalExperience.css'

const projects = [
  { title: 'Mede Analytics', period: '2024–2026', role: 'Frontend Developer', contribution: 'Built dashboard and reporting features, maintained shared React components, and added frontend tests during an MVC-to-React migration.', tools: ['React', 'TypeScript', 'Redux', 'Highcharts', 'Vitest', 'React Testing Library'] },
  { title: 'Kterio', period: '2022–2024', role: 'Full Stack Developer', contribution: 'Built frontend features for a building data management platform, integrated APIs, and contributed to REST endpoints and service-layer logic.', tools: ['React', 'Redux', 'C#', '.NET Core', 'EF Core', 'PostgreSQL'] },
  { title: 'Alpha Data Solutions', period: '2020–2022', role: 'Full Stack Developer', contribution: 'Developed frontend functionality and .NET Web API features for an investment analytics and reporting platform.', tools: ['Razor Pages', 'JavaScript', 'jQuery', 'C#', '.NET 5', 'EF Core', 'SQL Server'] },
]

export function ProfessionalExperience() {
  return (
    <section id="experience" className={`container portfolio-section`} aria-labelledby="experience-title" tabIndex={-1}>
      <h2 id="experience-title" className="section-title">Professional Experience</h2>
      <div className="experience-employment">
        <div className="experience-entry-heading">
          <h3>Frontend Developer · Midenas DOO</h3>
          <p>September 2020 – Present</p>
        </div>
        <p>I build and maintain enterprise web applications, working with designers and backend engineers from requirements through implementation and testing.</p>
      </div>
      <h3 className="experience-project-heading">Project assignments at Midenas</h3>
      <ol className="experience-timeline">
        {projects.map(({ title, period, role, contribution, tools }) => (
          <li key={title}>
            <div className="experience-entry-heading"><h4>{title}</h4><p>{period}</p></div>
            <p className="experience-role">{role}</p>
            <p>{contribution}</p>
            <TechnologyTags label={`${title} technologies`} tools={tools} />
          </li>
        ))}
      </ol>
    </section>
  )
}
