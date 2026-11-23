import { useLanguage } from '../../i18n/language'
import { relatedSkills, skillDetails } from './skillDetails'
import { skillLogo } from './skillGroups'
import type { SkillName, SkillTool } from './skillGroups'

type Props = {
  tool: SkillTool
  id: string
  headingId: string
  onClose: () => void
  onSelect: (skill: SkillName) => void
}

export function SkillDetailPanel({ tool: [name, logo], id, headingId, onClose, onSelect }: Props) {
  const { language, text: { skills: { explorer } } } = useLanguage()
  const { description, context } = skillDetails[name][language]
  const source = skillLogo(logo)
  const related = relatedSkills[name] ?? []

  return (
    <div id={id} className="skills-detail">
      <h4 className="skills-detail-title" id={headingId} tabIndex={-1}>
        {source && <img src={source} alt="" width="20" height="20" />}
        {name}
      </h4>
      <button className="skills-close" type="button" onClick={onClose} aria-label={explorer.close}>
        <span aria-hidden="true">×</span>
      </button>
      <p className="skills-role">{description}</p>
      {context && <p className="skills-context">{context}</p>}
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
