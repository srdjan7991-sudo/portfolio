import { expect, test } from 'vitest'
import { defaultReportFilters, reportScaleMaximum, summarizeReport } from './analyticsReport'

test('aggregates the six months without rounding the underlying average', () => {
  const report = summarizeReport(defaultReportFilters)
  expect(report.series).toEqual(['quality', 'utilization', 'operations'])
  expect(report.months.map(({ count }) => count)).toEqual([120, 140, 156, 200, 220, 240])
  expect(report.months.map(({ partial }) => partial)).toEqual([true, true, true, false, false, false])
  expect(report.chartMonths.map(({ points }) => (
    report.series.reduce((sum, series) => sum + (points[series]?.count ?? 0), 0)
  ))).toEqual(report.months.map(({ count }) => count))
  expect(report).toMatchObject({ total: 1076, monthsWithData: 6 })
  expect(reportScaleMaximum).toBe(140)
  expect(report.monthlyAverage).toBeCloseTo(179.333)
})

test('uses the previous calendar month even when it falls outside the selected period', () => {
  const report = summarizeReport({ period: 'secondQuarter', category: 'quality' })
  const [april] = report.months

  expect(report.series).toEqual(['quality'])
  expect(report.months.map(({ month }) => month)).toEqual([3, 4, 5])
  expect(report.chartMonths.map(({ inPeriod }) => inPeriod)).toEqual([false, false, false, true, true, true])
  expect(report.chartMonths[2].points).toEqual({ quality: null, utilization: null, operations: null })
  expect(report.chartMonths[3]).toBe(april)
  expect(april.points).toEqual({
    quality: { count: 102, change: { amount: 9, rate: 9 / 93 } },
    utilization: null,
    operations: null,
  })
})

test('retains months without observations and excludes them from the average', () => {
  const report = summarizeReport({ period: 'firstHalf', category: 'operations' })
  expect(report.months.map(({ count }) => count)).toEqual([null, null, null, 24, 28, 30])
  expect(report.months.some(({ partial }) => partial)).toBe(false)
  expect(report).toMatchObject({ total: 82, monthsWithData: 3 })
  expect(report.monthlyAverage).toBeCloseTo(27.333)
})

test('compares each category independently when a category first appears', () => {
  const report = summarizeReport(defaultReportFilters)
  const [january, , march, april, may] = report.months

  expect(january.points.quality).toEqual({ count: 72, change: null })
  expect(march.points.operations).toBeNull()
  expect(april.points).toEqual({
    quality: { count: 102, change: { amount: 9, rate: 9 / 93 } },
    utilization: { count: 74, change: { amount: 11, rate: 11 / 63 } },
    operations: { count: 24, change: null },
  })
  expect(may.points.operations).toEqual({ count: 28, change: { amount: 4, rate: 4 / 24 } })
})

test('returns an empty report when the selected category has no data in the period', () => {
  const report = summarizeReport({ period: 'firstQuarter', category: 'operations' })
  expect(report.months.map(({ count }) => count)).toEqual([null, null, null])
  expect(report.chartMonths.map(({ points }) => points.operations)).toEqual([null, null, null, null, null, null])
  expect(report).toMatchObject({ total: 0, monthsWithData: 0, monthlyAverage: null })
})
