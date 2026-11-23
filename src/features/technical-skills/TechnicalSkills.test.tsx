import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { LanguageProvider, useLanguage } from '../../i18n/language'
import { relatedSkills, skillDetails } from './skillDetails'
import { skillGroups } from './skillGroups'
import { TechnicalSkills } from './TechnicalSkills'

test('presents all skill categories and their technology lists in reading order', () => {
  render(<TechnicalSkills />)
  const headings = screen.getAllByRole('heading', { level: 3 })
  expect(headings).toHaveLength(5)
  const labels = ['Frontend Engineering', 'Analytics & Visualization', 'Testing', 'APIs & Data', 'Delivery & Collaboration']
  labels.forEach((name, index) => expect(headings[index]).toHaveAccessibleName(name))
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

test('brings the selected category first and restores the original overview and focus', async () => {
  const user = userEvent.setup()
  render(<TechnicalSkills />)
  const data = screen.getByRole('button', { name: 'APIs & Data' })
  data.focus()
  await user.keyboard('{Enter}')
  expect(data).toHaveFocus()
  expect(data).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveAccessibleName('APIs & Data')
  expect(screen.queryByRole('button', { name: 'Highcharts' })).toBeNull()
  expect(screen.getByRole('button', { name: 'SQL Server' })).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(data).toHaveFocus()
  expect(data).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveAccessibleName('Frontend Engineering')
  expect(screen.getByRole('button', { name: 'Highcharts' })).toBeInTheDocument()
})

test('follows related skills across categories and returns focus to the selected technology', async () => {
  const user = userEvent.setup()
  render(<TechnicalSkills />)
  const react = screen.getByRole('button', { name: 'React' })
  react.focus()
  await user.keyboard('{Enter}')
  const heading = screen.getByRole('heading', { name: 'React', level: 4 })
  expect(heading).toHaveFocus()
  expect(react).toHaveAttribute('aria-pressed', 'true')
  const details = heading.parentElement!
  expect(within(details).getByRole('heading', { name: 'Works with' })).toBeVisible()
  await user.click(within(details).getByRole('button', { name: 'Highcharts' }))
  expect(screen.getByRole('heading', { name: 'Highcharts', level: 4 })).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Analytics & Visualization' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('heading', { name: 'React', level: 4 })).toBeNull()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('button', { name: 'Highcharts' })).toHaveFocus()
  expect(screen.queryByRole('heading', { level: 4 })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'All categories' }))
  expect(screen.getByRole('button', { name: 'Analytics & Visualization' })).toHaveFocus()
})

test('keeps pointer highlighting transient while keyboard focus remains on its skill', async () => {
  const user = userEvent.setup()
  render(<TechnicalSkills />)
  const react = screen.getByRole('button', { name: 'React' })
  const typescript = screen.getByRole('button', { name: 'TypeScript' })
  const highcharts = screen.getByRole('button', { name: 'Highcharts' })
  act(() => react.focus())
  expect(react).toHaveAttribute('data-relation', 'highlighted')
  expect(highcharts).toHaveAttribute('data-relation', 'related')
  await user.hover(typescript)
  expect(typescript).toHaveAttribute('data-relation', 'highlighted')
  await user.unhover(typescript)
  expect(react).toHaveAttribute('data-relation', 'highlighted')
  expect(screen.queryByRole('heading', { level: 4 })).toBeNull()
})

function LanguageControl() {
  const { setLanguage } = useLanguage()
  return <button type="button" onClick={() => setLanguage('sr')}>Serbian</button>
}

test('retains the selected technology when the language changes', async () => {
  const user = userEvent.setup()
  try {
    render(<LanguageProvider><LanguageControl /><TechnicalSkills /></LanguageProvider>)
    await user.click(screen.getByRole('button', { name: 'React' }))
    expect(screen.getByText(skillDetails.React.en.description)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Serbian' }))
    expect(screen.getByRole('heading', { name: 'React', level: 4 })).toBeVisible()
    expect(screen.getByText(skillDetails.React.sr.description)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Povezane tehnologije' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Zatvori detalje' })).toBeVisible()
  } finally {
    localStorage.clear()
    document.documentElement.lang = 'en'
    document.title = ''
  }
})

test('links only documented skills and keeps all relationships reversible', () => {
  const names = skillGroups.flatMap(group => group.tools.map(([name]) => name))
  expect(Object.keys(skillDetails).sort()).toEqual([...names].sort())
  for (const name of names) {
    const connections = relatedSkills[name] ?? []
    expect(connections).not.toContain(name)
    expect(new Set(connections).size).toBe(connections.length)
    for (const target of connections) expect(relatedSkills[target]).toContain(name)
  }
})
