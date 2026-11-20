import { expect, test } from 'vitest'
import { defaultReportFilters, reportScaleMaximum, summarizeReport } from './analyticsReport'

test('aggregates the six months without rounding the underlying average', () => {
  const report = summarizeReport(defaultReportFilters)
  expect(report.months.map(({ count }) => count)).toEqual([120, 140, 156, 200, 220, 240])
  expect(report.months.map(({ partial }) => partial)).toEqual([true, true, true, false, false, false])
  expect(report).toMatchObject({ total: 1076, monthsWithData: 6 })
  expect(reportScaleMaximum).toBe(240)
  expect(report.monthlyAverage).toBeCloseTo(179.333)
})

test('retains months without observations and excludes them from the average', () => {
  const report = summarizeReport({ period: 'firstHalf', category: 'operations' })
  expect(report.months.map(({ count }) => count)).toEqual([null, null, null, 24, 28, 30])
  expect(report.months.some(({ partial }) => partial)).toBe(false)
  expect(report).toMatchObject({ total: 82, monthsWithData: 3 })
  expect(report.monthlyAverage).toBeCloseTo(27.333)
})

test('returns an empty report when the selected category has no data in the period', () => {
  const report = summarizeReport({ period: 'firstQuarter', category: 'operations' })
  expect(report.months.map(({ count }) => count)).toEqual([null, null, null])
  expect(report).toMatchObject({ total: 0, monthsWithData: 0, monthlyAverage: null })
})
