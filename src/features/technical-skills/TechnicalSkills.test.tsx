import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { LanguageProvider, useLanguage } from '../../i18n/language'
import { ProfessionalExperience } from '../professional-experience/ProfessionalExperience'
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

test.each(['Enter', 'Escape'])('keeps the focused skill highlighted when %s closes its detail', async (key) => {
  const user = userEvent.setup()
  render(<TechnicalSkills />)
  const highcharts = screen.getByRole('button', { name: 'Highcharts' })
  highcharts.focus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('heading', { name: 'Highcharts', level: 4 })).toHaveFocus()
  await user.tab({ shift: true })
  expect(highcharts).toHaveFocus()
  await user.keyboard(`{${key}}`)
  expect(screen.queryByRole('heading', { level: 4 })).toBeNull()
  expect(highcharts).toHaveFocus()
  expect(highcharts).toHaveAttribute('data-relation', 'highlighted')
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

test.each([
  ['Highcharts', 'View work on Mede Analytics', '#work-mede'],
  ['C#', 'View work on Kterio', '#experience-kterio'],
])('links %s to its confirmed project', async (skill, label, href) => {
  const user = userEvent.setup()
  render(<TechnicalSkills />)
  const tool = screen.getByRole('button', { name: skill })
  tool.focus()
  await user.keyboard('{Enter}')
  const heading = screen.getByRole('heading', { name: skill, level: 4 })
  expect(heading).toHaveFocus()
  expect(within(heading.parentElement!).getByRole('link', { name: label })).toHaveAttribute('href', href)
})

test('restores focus in both directions of a native project visit', async () => {
  const user = userEvent.setup()
  const originalState = history.state
  const originalUrl = location.href
  const projectId = 'work-mede'
  try {
    history.replaceState(null, '', '#skills')
    const replaceState = vi.spyOn(history, 'replaceState')
    render(<><TechnicalSkills /><article id={projectId} tabIndex={-1}>Mede Analytics</article></>)
    await user.click(screen.getByRole('button', { name: 'Highcharts' }))
    const link = screen.getByRole('link', { name: 'View work on Mede Analytics' })
    // jsdom activates modified links in the same context. Cancel the browser default after React handles the event.
    window.addEventListener('click', event => event.preventDefault(), { once: true })
    fireEvent.click(link, { ctrlKey: true })
    expect(replaceState).not.toHaveBeenCalled()

    const project = document.getElementById(projectId)
    link.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(project).toHaveFocus())
    expect(location.hash).toBe('#work-mede')
    history.back()
    await waitFor(() => expect(link).toHaveFocus())
    expect(location.hash).toBe('#skills')
    history.forward()
    await waitFor(() => expect(project).toHaveFocus())
    expect(location.hash).toBe('#work-mede')
  } finally {
    history.replaceState(originalState, '', originalUrl)
  }
})

test('distinguishes two history entries for the same project surrounding a Skills visit', async () => {
  const user = userEvent.setup()
  const originalState = history.state
  const originalUrl = location.href
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  try {
    history.replaceState(null, '', '#experience-kterio')
    render(<><TechnicalSkills /><ProfessionalExperience /></>)
    const project = screen.getByRole('heading', { name: 'Kterio', level: 4 })
    const technology = within(project.closest('li')!).getByRole('link', { name: 'C#' })
    await user.click(technology)
    const skill = () => screen.getByRole('heading', { name: 'C#', level: 4 })
    const link = () => screen.getByRole('link', { name: 'View work on Kterio' })
    expect(skill()).toHaveFocus()
    await user.click(link())
    await waitFor(() => expect(project).toHaveFocus())
    expect(location.hash).toBe('#experience-kterio')
    history.back()
    await waitFor(() => expect(link()).toHaveFocus())
    history.back()
    await waitFor(() => expect(technology).toHaveFocus())
    expect(location.hash).toBe('#experience-kterio')
    history.forward()
    await waitFor(() => expect(skill()).toHaveFocus())
    expect(location.hash).toBe('#skill-c-sharp')
  } finally {
    history.replaceState(originalState, '', originalUrl)
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

test('opens an addressed skill even when its group is closed and clears the address when closing details', async () => {
  const user = userEvent.setup()
  const previousUrl = location.href
  const navigateTo = (hash: string) => act(() => {
    history.replaceState(null, '', hash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  try {
    history.replaceState(null, '', '#skill-highcharts')
    render(<TechnicalSkills />)
    expect(screen.getByRole('heading', { level: 4, name: 'Highcharts' })).toHaveAttribute('id', 'skill-highcharts')
    expect(screen.queryByRole('button', { name: 'SQL Server' })).toBeNull()

    navigateTo('#skills')
    expect(screen.queryByRole('heading', { level: 4 })).toBeNull()
    const testing = screen.getByRole('button', { name: 'Testing' })
    await user.click(testing)

    navigateTo('#skill-sql-server')
    const linkedHeading = screen.getByRole('heading', { level: 4, name: 'SQL Server' })
    expect(linkedHeading).toHaveFocus()
    expect(linkedHeading).toHaveAttribute('data-linked')
    navigateTo('#skills')
    expect(testing).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('heading', { level: 4 })).toBeNull()

    navigateTo('#skill-sql-server')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'SQL Server' })).toHaveFocus()
    expect(location.hash).toBe('#skills')
  } finally {
    history.replaceState(null, '', previousUrl)
  }
})

test.each([
  { action: 'Close details', restoreTesting: true, destination: '.NET' },
  { action: 'All categories', restoreTesting: false, destination: 'APIs & Data' },
])('restores history focus and selection after $action', async ({ action, restoreTesting, destination }) => {
  const user = userEvent.setup()
  const previousUrl = location.href
  const previousState = history.state
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  try {
    history.replaceState(null, '', '#experience')
    render(<><TechnicalSkills /><ProfessionalExperience /></>)
    const testing = screen.getByRole('button', { name: 'Testing' })
    if (restoreTesting) await user.click(testing)
    const link = screen.getByRole('link', { name: '.NET 5' })
    link.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: '.NET', level: 4 })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: action }))
    expect(location.hash).toBe('#skills')
    history.back()

    await waitFor(() => expect(link).toHaveFocus())
    expect(location.hash).toBe('#experience')
    expect(testing).toHaveAttribute('aria-pressed', String(restoreTesting))
    await user.tab()
    expect(within(link.closest('ul')!).getByRole('link', { name: 'EF Core' })).toHaveFocus()
    history.forward()
    await waitFor(() => expect(screen.getByRole('button', { name: destination })).toHaveFocus())
    expect(location.hash).toBe('#skills')
  } finally {
    history.replaceState(previousState, '', previousUrl)
    scrollTo.mockRestore()
  }
})
