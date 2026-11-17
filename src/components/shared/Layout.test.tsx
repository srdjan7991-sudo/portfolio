import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Footer, Header } from './Layout'

test('desktop navigation links to each section in reading order', () => {
  render(<Header />)
  const navigation = screen.getByRole('navigation', { name: 'Main navigation' })
  expect(within(navigation).getAllByRole('link').map((link) => [
    link.textContent, link.getAttribute('href'),
  ])).toEqual([
    ['Work', '#work'],
    ['Skills', '#skills'],
    ['Expertise', '#expertise'],
    ['Experience', '#experience'],
    ['Education', '#education'],
    ['Contact', '#contact'],
  ])
  expect(screen.getByRole('link', { name: 'Srdjan Pajic' })).toHaveAttribute('href', '#top')
})

test('mobile menu opens and closes using its trigger', async () => {
  const user = userEvent.setup()
  render(<Header />)
  const menu = screen.getByRole('button', { name: 'Menu' })
  expect(menu).toHaveAttribute('aria-expanded', 'false')
  await user.click(menu)
  expect(menu).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getAllByRole('navigation')).toHaveLength(2)
  await user.click(menu)
  expect(menu).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getAllByRole('navigation')).toHaveLength(1)
})

test('mobile menu closes after selecting a section', async () => {
  const user = userEvent.setup()
  render(<Header />)
  const menu = screen.getByRole('button', { name: 'Menu' })
  try {
    await user.click(menu)
    const mobileNavigation = screen.getAllByRole('navigation')[1]
    await user.click(within(mobileNavigation).getByRole('link', { name: 'Skills' }))
    expect(menu).toHaveAttribute('aria-expanded', 'false')
  } finally {
    window.history.replaceState(null, '', '/')
  }
})

test('returning to the hero through the brand also dismisses the mobile menu', async () => {
  const user = userEvent.setup()
  render(<><Header /><section id="top" aria-label="Introduction" /></>)
  const menu = screen.getByRole('button', { name: 'Menu' })
  try {
    await user.click(menu)
    await user.click(screen.getByRole('link', { name: 'Srdjan Pajic' }))
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(window.location.hash).toBe('#top'))
  } finally {
    window.history.replaceState(null, '', '/')
  }
})

test('marks the current section in both navigation lists as the reader scrolls', async () => {
  const user = userEvent.setup()
  render(<>
    <Header />
    <section id="work" aria-label="Selected Work" />
    <section id="skills" aria-label="Technical Skills" />
  </>)
  const work = screen.getByRole('region', { name: 'Selected Work' })
  const skills = screen.getByRole('region', { name: 'Technical Skills' })
  vi.spyOn(work, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: 0 }))
  const skillPosition = vi.spyOn(skills, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: 500 }))
  await user.click(screen.getByRole('button', { name: 'Menu' }))
  const navigations = screen.getAllByRole('navigation').map((navigation) => within(navigation))
  await waitFor(() => {
    for (const navigation of navigations) {
      expect(navigation.getByRole('link', { current: 'location' })).toHaveAccessibleName('Work')
    }
  })

  skillPosition.mockReturnValue(DOMRect.fromRect({ y: 0 }))
  fireEvent.scroll(window)
  await waitFor(() => {
    for (const navigation of navigations) {
      expect(navigation.getByRole('link', { current: 'location' })).toHaveAccessibleName('Skills')
    }
  })
})

test('mobile navigation supports keyboard traversal and restores focus on Escape', async () => {
  const user = userEvent.setup()
  render(<Header />)
  const menu = screen.getByRole('button', { name: 'Menu' })
  const brand = screen.getByRole('link', { name: 'Srdjan Pajic' })
  await user.tab()
  expect(brand).toHaveFocus()
  // jsdom does not apply the breakpoint that hides the desktop navigation.
  for (const link of within(screen.getByRole('navigation')).getAllByRole('link')) {
    await user.tab()
    expect(link).toHaveFocus()
  }
  await user.tab()
  expect(menu).toHaveFocus()
  await user.keyboard('{Enter}')
  const mobileNavigation = screen.getAllByRole('navigation')[1]
  await user.tab()
  expect(within(mobileNavigation).getByRole('link', { name: 'Work' })).toHaveFocus()
  await user.tab()
  expect(within(mobileNavigation).getByRole('link', { name: 'Skills' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(menu).toHaveAttribute('aria-expanded', 'false')
  expect(menu).toHaveFocus()
})

test('footer identifies the author and links back to the hero', () => {
  render(<Footer />)
  const footer = within(screen.getByRole('contentinfo'))
  expect(footer.getByText('© Srdjan Pajic')).toBeInTheDocument()
  expect(footer.getByRole('link', { name: 'Back to top' })).toHaveAttribute('href', '#top')
})
