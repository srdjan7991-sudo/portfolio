export const reportYear = 2026

const periodRanges = {
  firstHalf: [0, 6],
  firstQuarter: [0, 3],
  secondQuarter: [3, 6],
} as const

export type ReportPeriod = keyof typeof periodRanges
function isReportPeriod(value: string): value is ReportPeriod {
  return Object.hasOwn(periodRanges, value)
}

export const reportPeriods = Object.keys(periodRanges).filter(isReportPeriod)

export const reportSeries = ['quality', 'utilization', 'operations'] as const
export type ReportSeries = typeof reportSeries[number]
export const reportCategories = ['all', ...reportSeries] as const
export type ReportCategory = typeof reportCategories[number]

export type ReportFilters = Readonly<{ period: ReportPeriod; category: ReportCategory }>
export type Observation = Readonly<{ month: number; series: ReportSeries }>
export const defaultReportFilters: ReportFilters = { period: 'firstHalf', category: 'all' }

type MonthlyCounts = Readonly<Partial<Record<ReportSeries, number>>>
export type ReportPoint = Readonly<{
  count: number
  change: Readonly<{ amount: number; rate: number | null }> | null
}>

// Each entry is a calendar month from January through June. Missing categories are unreported.
const monthlyCounts: readonly MonthlyCounts[] = [
  { quality: 72, utilization: 48 },
  { quality: 86, utilization: 54 },
  { quality: 93, utilization: 63 },
  { quality: 102, utilization: 74, operations: 24 },
  { quality: 115, utilization: 77, operations: 28 },
  { quality: 121, utilization: 89, operations: 30 },
]

// Keep the scale comparable between filters so a lower count always draws a shorter bar.
const highestObservation = Math.max(...monthlyCounts.flatMap(counts => Object.values(counts)))
export const reportScaleMaximum = Math.max(20, Math.ceil(highestObservation / 20) * 20)

export function compareReportCounts(start: number | null, end: number | null): ReportPoint['change'] {
  if (start === null || end === null) return null
  const amount = end - start
  return { amount, rate: start === 0 ? null : amount / start }
}

function reportPoint(count: number | undefined, previous: number | undefined): ReportPoint | null {
  return count === undefined ? null : { count, change: compareReportCounts(previous ?? null, count) }
}

export function summarizeReport({ period, category }: ReportFilters) {
  const [start, end] = periodRanges[period]
  const series: readonly ReportSeries[] = category === 'all' ? reportSeries : [category]
  let total = 0
  let monthsWithData = 0

  const chartMonths = monthlyCounts.map((counts, month) => {
    const inPeriod = month >= start && month < end
    const points: Record<ReportSeries, ReportPoint | null> = { quality: null, utilization: null, operations: null }
    const previous = monthlyCounts[month - 1]
    let available = 0
    let monthlyTotal = 0

    if (inPeriod) {
      for (const key of series) {
        const point = reportPoint(counts[key], previous?.[key])
        points[key] = point
        if (point !== null) {
          available++
          monthlyTotal += point.count
        }
      }
    }

    if (available > 0) {
      total += monthlyTotal
      monthsWithData++
    }

    return { month, inPeriod, points, count: available > 0 ? monthlyTotal : null, partial: available > 0 && available < series.length }
  })

  return {
    series,
    chartMonths,
    months: chartMonths.filter(month => month.inPeriod),
    total,
    monthsWithData,
    monthlyAverage: monthsWithData ? total / monthsWithData : null,
  }
}
