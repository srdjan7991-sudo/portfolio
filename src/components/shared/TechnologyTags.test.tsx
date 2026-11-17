import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { TechnologyTags } from './TechnologyTags'

test('renders the supplied technologies in a named list and in the supplied order', () => {
  render(<TechnologyTags label="Project technologies" tools={['React', 'C#', 'PostgreSQL']} />)
  const list = screen.getByRole('list', { name: 'Project technologies' })
  expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'React', 'C#', 'PostgreSQL',
  ])
})
