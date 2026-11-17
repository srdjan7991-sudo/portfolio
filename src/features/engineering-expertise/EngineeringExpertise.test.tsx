import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { EngineeringExpertise } from './EngineeringExpertise'

test('shows the three expertise areas and describes the work behind them', () => {
  render(<EngineeringExpertise />)
  for (const [name, description] of [
    ['Enterprise Frontend', /move legacy interfaces to React/],
    ['Analytics & Data Visualization', /dashboards and reporting workflows/],
    ['API Integration & Testing', /connect React features to .NET APIs/],
  ] as const) {
    expect(screen.getByRole('heading', { name, level: 3 })).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  }
})
