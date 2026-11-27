import { useLanguage } from '../../i18n/language'
import type { Language } from '../../i18n/language'
import type { MouseEvent } from 'react'
import { relatedSkills, skillDetails } from './skillDetails'
import { skillLogo } from './skillGroups'
import type { SkillName, SkillTool } from './skillGroups'

type Props = {
  tool: SkillTool
  id: string
  headingId: string
  linked?: boolean
  onClose: () => void
  onSelect: (skill: SkillName) => void
  onProjectLink: (event: MouseEvent<HTMLAnchorElement>) => void
}

type ProjectEvidence = {
  href: `#${string}`
  label: Record<Language, string>
}

const medeEvidence: ProjectEvidence = {
  href: '#work-mede',
  label: { en: 'View work on Mede Analytics', sr: 'Pogledaj rad na projektu Mede Analytics' },
}

const projectEvidence: Partial<Record<SkillName, ProjectEvidence>> = {
  React: medeEvidence,
  TypeScript: medeEvidence,
  Highcharts: medeEvidence,
  'C#': {
    href: '#experience-kterio',
    label: { en: 'View work on Kterio', sr: 'Pogledaj rad na projektu Kterio' },
  },
}

export function SkillDetailPanel({ tool: [name, logo], id, headingId, linked, onClose, onSelect, onProjectLink }: Props) {
  const { language, text: { skills: { explorer } } } = useLanguage()
  const { description, context } = skillDetails[name][language]
  const source = skillLogo(logo)
  const related = relatedSkills[name] ?? []
  const project = projectEvidence[name]

  return (
    <div id={id} className="skills-detail">
      <h4 className="skills-detail-title" id={headingId} tabIndex={-1} data-linked={linked || undefined}>
        {source && <img src={source} alt="" width="20" height="20" />}
        {name}
      </h4>
      <button className="skills-close" type="button" onClick={onClose} aria-label={explorer.close}>
        <span aria-hidden="true">×</span>
      </button>
      <p className="skills-role">{description}</p>
      {context && <p className="skills-context">{context}</p>}
      {project && (
        <a className="skills-project-link" id={`${headingId}-project`} href={project.href} onClick={onProjectLink}>
          {project.label[language]} <span aria-hidden="true">↗</span>
        </a>
      )}
      {related.length > 0 && (
        <div className="skills-relations">
          <h5>{explorer.related}</h5>
          <ul>
            {related.map(skill => (
              <li key={skill}><button type="button" onClick={() => onSelect(skill)}>{skill}</button></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
