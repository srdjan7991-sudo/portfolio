import { PortfolioSection } from '../../components/shared/PortfolioSection'
import { useLanguage } from '../../i18n/language'
import type { Messages } from '../../i18n/en'
import './TechnicalSkills.css'

const logos = import.meta.glob('../../assets/brands/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

type SkillTool = readonly [name: string, logo?: string]
const groups: readonly { id: Exclude<keyof Messages['skills'], 'intro'>; tools: readonly SkillTool[] }[] = [
  { id: 'frontend', tools: [
    ['React', 'react'], ['TypeScript', 'typescript'], ['JavaScript', 'javascript'], ['Redux', 'redux'],
    ['HTML', 'html5'], ['CSS', 'css'], ['SCSS', 'sass'],
  ] },
  { id: 'analytics', tools: [['Highcharts']] },
  { id: 'testing', tools: [
    ['Vitest', 'vitest'], ['React Testing Library', 'testinglibrary'], ['Jest', 'jest'], ['NUnit'],
  ] },
  { id: 'data', tools: [
    ['C#'], ['.NET', 'dotnet'], ['ASP.NET Core Web API'], ['Entity Framework Core'], ['SQL Server'], ['PostgreSQL', 'postgresql'],
  ] },
  { id: 'delivery', tools: [
    ['Git', 'git'], ['Azure DevOps'], ['Figma', 'figma'],
  ] },
]

export function TechnicalSkills() {
  const { text: { skills } } = useLanguage()
  return (
    <PortfolioSection id="skills" intro={skills.intro}>
      <div className="technical-skills-skill-grid">
        {groups.map(({ id, tools }, index) => (
          <div key={id} className={index === 0 ? 'technical-skills-primary-skills' : 'technical-skills-skill-group'}>
            <h3>{skills[id].title}</h3>
            <p>{skills[id].description}</p>
            <ul className="technical-skills-skill-list">
              {tools.map(([label, logo], toolIndex) => {
                const src = logos[`../../assets/brands/${logo}.svg`]
                return (
                  <li className={index === 0 && toolIndex < 2 ? 'technical-skills-primary-tool' : undefined} key={label}>
                    {src && <img src={src} alt="" width="18" height="18" />}
                    {label}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </PortfolioSection>
  )
}
