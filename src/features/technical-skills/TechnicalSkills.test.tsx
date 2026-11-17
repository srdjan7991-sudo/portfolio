import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { TechnicalSkills } from './TechnicalSkills'

test('presents all skill categories and their technology lists in reading order', () => {
  render(<TechnicalSkills />)
  expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
    'Frontend Engineering', 'Analytics & Visualization', 'Testing', 'APIs & Data', 'Delivery & Collaboration',
  ])
  expect(screen.getAllByRole('list').map((list) =>
    Array.from(list.children, (item) => item.textContent),
  )).toEqual([
    ['React', 'TypeScript', 'JavaScript', 'Redux', 'HTML', 'CSS', 'SCSS'],
    ['Highcharts'],
    ['Vitest', 'React Testing Library', 'Jest', 'NUnit'],
    ['C#', '.NET', 'ASP.NET Core Web API', 'Entity Framework Core', 'SQL Server', 'PostgreSQL'],
    ['Git', 'Azure DevOps', 'Figma'],
  ])
})
