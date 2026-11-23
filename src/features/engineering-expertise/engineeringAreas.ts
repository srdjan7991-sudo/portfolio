export const engineeringAreas = {
  frontend: ['components', 'reusable', 'state', 'responsive', 'accessibility', 'performance'],
  visualization: ['dashboards', 'presentation', 'charts', 'aggregation', 'dataDriven'],
  integration: ['rest', 'async', 'lifecycle', 'errors', 'communication'],
  architecture: ['separation', 'modularity', 'shared', 'maintenance', 'modernization'],
  quality: ['componentTests', 'integrationTests', 'interactionTests', 'regressions', 'reliability'],
} as const

export type EngineeringArea = keyof typeof engineeringAreas
export type EngineeringConcept = (typeof engineeringAreas)[EngineeringArea][number]
export const engineeringAreaIds = Object.keys(engineeringAreas) as EngineeringArea[]

export const engineeringTools: Record<EngineeringArea, readonly string[]> = {
  frontend: ['React', 'TypeScript', 'JavaScript', 'Redux', 'HTML', 'CSS', 'SCSS'],
  visualization: ['Highcharts', 'React', 'TypeScript', 'SQL Server'],
  integration: ['ASP.NET Core', '.NET', 'C#', 'REST', 'JavaScript', 'TypeScript'],
  architecture: ['React', 'TypeScript', 'C#', '.NET', 'Entity Framework Core'],
  quality: ['Vitest', 'React Testing Library', 'NUnit'],
}

export type EngineeringTopics = {
  [Area in EngineeringArea]: {
    title: string
    description: string
    evidence: string
  }
}

export type EngineeringConcepts = Record<EngineeringConcept, {
  title: string
  description: string
}>
