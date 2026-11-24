// The walkthrough holds the completed motion so the explanation stays readable.
export const phaseReadingTime = 4000

export const steps = [
  { id: 'interaction', duration: 1500 },
  { id: 'communication', duration: 2250 },
  { id: 'processing', duration: 2300 },
  { id: 'database', duration: 3100 },
  { id: 'response', duration: 2350 },
  { id: 'result', duration: 2400 },
] as const

export type RequestPhase = typeof steps[number]['id']

export function stepIndex(phase: RequestPhase) {
  return steps.findIndex(step => step.id === phase)
}

export const systems = [
  { id: 'browser', stack: 'React · TypeScript' },
  { id: 'server', stack: 'ASP.NET Core · C#' },
  { id: 'database', stack: 'SQL Server' },
] as const
