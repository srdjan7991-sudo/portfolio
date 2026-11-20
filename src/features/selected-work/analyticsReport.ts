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

const categories = ['quality', 'utilization', 'operations'] as const
export const reportCategories = ['all', ...categories] as const
export type ReportCategory = typeof reportCategories[number]

export type ReportFilters = Readonly<{ period: ReportPeriod; category: ReportCategory }>
export const defaultReportFilters: ReportFilters = { period: 'firstHalf', category: 'all' }

type MonthlyCounts = Readonly<Partial<Record<typeof categories[number], number>>>

// Each entry is a calendar month from January through June. Missing categories are unreported.
const monthlyCounts: readonly MonthlyCounts[] = [
  { quality: 72, utilization: 48 },
  { quality: 86, utilization: 54 },
  { quality: 93, utilization: 63 },
  { quality: 102, utilization: 74, operations: 24 },
  { quality: 115, utilization: 77, operations: 28 },
  { quality: 121, utilization: 89, operations: 30 },
]

export const reportMonths: readonly number[] = monthlyCounts.map((_, month) => month)

function sumCounts(counts: readonly number[]) {
  return counts.reduce((sum, count) => sum + count, 0)
}

// Keep the scale comparable between filters so a lower count always draws a shorter bar.
const highestMonthlyTotal = Math.max(...monthlyCounts.map(counts => sumCounts(Object.values(counts))))
export const reportScaleMaximum = Math.max(20, Math.ceil(highestMonthlyTotal / 20) * 20)

export function summarizeReport({ period, category }: ReportFilters) {
  const [start, end] = periodRanges[period]
  const selectedCategories = category === 'all' ? categories : [category]
  let total = 0
  let monthsWithData = 0

  const months = monthlyCounts.slice(start, end).map((counts, index) => {
    const reportedCounts = selectedCategories
      .map(key => counts[key])
      .filter(count => count !== undefined)
    const count = reportedCounts.length ? sumCounts(reportedCounts) : null
    const partial = count !== null && reportedCounts.length < selectedCategories.length

    if (count !== null) {
      total += count
      monthsWithData++
    }

    return { month: start + index, count, partial }
  })

  return {
    months,
    total,
    monthsWithData,
    monthlyAverage: monthsWithData ? total / monthsWithData : null,
  }
}
