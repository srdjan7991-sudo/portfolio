import { useId, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { PortfolioSection } from '../../components/shared/PortfolioSection'
import { TechnologyTags } from '../../components/shared/TechnologyTags'
import { useLanguage } from '../../i18n/language'
import { findSkill, skillAnchor } from '../technical-skills/skillGroups'
import type { SkillName } from '../technical-skills/skillGroups'
import { useExperienceTimeline } from './useExperienceTimeline'
import './ProfessionalExperience.css'

const projects = [
  { title: 'Mede Analytics', period: '2024–2026', role: 'frontend', contribution: 'mede', tools: ['React', 'TypeScript', 'Redux', 'Highcharts', 'Vitest', 'React Testing Library'] },
  { title: 'Kterio', period: '2022–2024', role: 'fullstack', contribution: 'kterio', tools: ['React', 'Redux', 'C#', '.NET Core', 'EF Core', 'PostgreSQL'] },
  { title: 'Alpha Data Solutions', period: '2020–2022', role: 'fullstack', contribution: 'alpha', tools: ['Razor Pages', 'JavaScript', 'jQuery', 'C#', '.NET 5', 'EF Core', 'SQL Server'] },
] as const

const skillAliases = new Map<string, SkillName>([
  ['EF Core', 'Entity Framework Core'],
  ['.NET Core', '.NET'],
  ['.NET 5', '.NET'],
])

function skillLink(tool: string) {
  const skill = skillAliases.get(tool) ?? findSkill(tool)
  return skill ? `#${skillAnchor(skill)}` : undefined
}

function followSkillLink(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

  // The Skills heading is mounted on navigation. Let it own focus and scrolling.
  const oldURL = location.href
  const { hash } = event.currentTarget
  event.preventDefault()
  if (location.hash !== hash) history.pushState(history.state, '', hash)
  window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: location.href }))
}

function ProjectDetails({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()

  return (
    <div className="experience-details">
      <button type="button" className="ui-pill experience-details-toggle" aria-expanded={expanded}
        aria-controls={id} aria-label={title} onClick={() => setExpanded(open => !open)}>
        {label} <span aria-hidden="true">+</span>
      </button>
      <div className="experience-details-panel" id={id} data-open={expanded}
        aria-hidden={!expanded} inert={!expanded}>
        <div className="experience-details-clip">
          <div className="experience-details-content">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function ProfessionalExperience() {
  const { text: { experience, work } } = useLanguage()
  const section = useRef<HTMLElement>(null)
  useExperienceTimeline(section)

  return (
    <PortfolioSection id="experience" customReveal ref={section}>
      <div className="experience-employment">
        <div className="experience-entry-heading">
          <h3>{experience.frontend} · Midenas DOO</h3>
          <p>{experience.since}</p>
        </div>
        <p>{experience.description}</p>
      </div>
      <h3 className="experience-project-heading">{experience.assignments}</h3>
      <ol className="experience-timeline" aria-label={experience.assignments}>
        {projects.map(({ title, period, role, contribution, tools }) => (
          <li key={title}>
            <div className="experience-project">
              <div className="experience-entry-heading"><h4>{title}</h4><p>{period}</p></div>
              <p className="experience-role">{experience[role]}</p>
              <p>{experience[contribution]}</p>
              <TechnologyTags label={work.technologies(title)} tools={tools} linkFor={skillLink} onLinkClick={followSkillLink} />
              {contribution === 'mede' && (
                <ProjectDetails label={experience.details} title={experience.detailsFor(title)}>
                  <dl>
                    {Object.values(work.details).map(({ label, body }) => (
                      <div key={label}><dt>{label}</dt><dd>{body}</dd></div>
                    ))}
                  </dl>
                </ProjectDetails>
              )}
              {contribution === 'kterio' && (
                <ProjectDetails label={experience.details} title={experience.detailsFor(title)}>
                  <p>{work.kterio}</p>
                </ProjectDetails>
              )}
            </div>
          </li>
        ))}
      </ol>
    </PortfolioSection>
  )
}
