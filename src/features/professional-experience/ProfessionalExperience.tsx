import { PortfolioSection } from '../../components/shared/PortfolioSection'
import { TechnologyTags } from '../../components/shared/TechnologyTags'
import { useLanguage } from '../../i18n/language'
import './ProfessionalExperience.css'

const projects = [
  { title: 'Mede Analytics', period: '2024–2026', role: 'frontend', contribution: 'mede', tools: ['React', 'TypeScript', 'Redux', 'Highcharts', 'Vitest', 'React Testing Library'] },
  { title: 'Kterio', period: '2022–2024', role: 'fullstack', contribution: 'kterio', tools: ['React', 'Redux', 'C#', '.NET Core', 'EF Core', 'PostgreSQL'] },
  { title: 'Alpha Data Solutions', period: '2020–2022', role: 'fullstack', contribution: 'alpha', tools: ['Razor Pages', 'JavaScript', 'jQuery', 'C#', '.NET 5', 'EF Core', 'SQL Server'] },
] as const

export function ProfessionalExperience() {
  const { text: { experience, work } } = useLanguage()
  return (
    <PortfolioSection id="experience">
      <div className="experience-employment">
        <div className="experience-entry-heading">
          <h3>{experience.frontend} · Midenas DOO</h3>
          <p>{experience.since}</p>
        </div>
        <p>{experience.description}</p>
      </div>
      <h3 className="experience-project-heading">{experience.assignments}</h3>
      <ol className="experience-timeline">
        {projects.map(({ title, period, role, contribution, tools }) => (
          <li key={title}>
            <div className="experience-entry-heading"><h4>{title}</h4><p>{period}</p></div>
            <p className="experience-role">{experience[role]}</p>
            <p>{experience[contribution]}</p>
            <TechnologyTags label={work.technologies(title)} tools={tools} />
          </li>
        ))}
      </ol>
    </PortfolioSection>
  )
}
