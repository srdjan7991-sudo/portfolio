export const skillGroups = [
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
] as const satisfies readonly { id: string; tools: readonly (readonly [name: string, logo?: string])[] }[]

type SkillGroup = (typeof skillGroups)[number]
export type SkillGroupId = SkillGroup['id']
export type SkillName = SkillGroup['tools'][number][0]
export type SkillTool = readonly [name: SkillName, logo?: string]

const logos = import.meta.glob('../../assets/brands/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export function skillLogo(logo: string | undefined) {
  return logo ? logos[`../../assets/brands/${logo}.svg`] : undefined
}

export function groupForSkill(name: SkillName) {
  return skillGroups.find(group => group.tools.some(tool => tool[0] === name))
}

const skillNames = skillGroups.flatMap(group => group.tools.map(([name]) => name))

export function findSkill(name: string) {
  return skillNames.find(skill => skill === name)
}

export function skillAnchor(name: SkillName) {
  const slug = name === '.NET' ? 'dotnet' : name.toLowerCase().replace('#', '-sharp').replaceAll(' ', '-')
  return `skill-${slug}`
}

export function linkedSkill(hash: string) {
  return hash.startsWith('#skill-') ? skillNames.find(name => `#${skillAnchor(name)}` === hash) : undefined
}
