import { useState } from 'react'
import { useLanguage } from '../../i18n/language'
import type { Language } from '../../i18n/language'

type Range = 'all' | 'recent'

type ChartCopy = {
  title: string
  rangeLabel: string
  mean: string
  ranges: Record<Range, string>
  week: string
  weekShort: string
  comparison: string
  noComparison: string
}

const chartCopy = {
  en: {
    title: 'Sample response times',
    rangeLabel: 'Date range',
    mean: 'Average for this range',
    ranges: { all: '6 weeks', recent: '3 weeks' },
    week: 'Week',
    weekShort: 'W',
    comparison: 'vs. previous week',
    noComparison: 'First week in this range.',
  },
  sr: {
    title: 'Primer vremena odziva',
    rangeLabel: 'Vremenski period',
    mean: 'Prosek za ovaj period',
    ranges: { all: '6 nedelja', recent: '3 nedelje' },
    week: 'Nedelja',
    weekShort: 'N',
    comparison: 'u odnosu na prethodnu nedelju',
    noComparison: 'Prva nedelja u ovom periodu.',
  },
} satisfies Record<Language, ChartCopy>

const weeks = [
  { week: 1, latency: 168 },
  { week: 2, latency: 134 },
  { week: 3, latency: 182 },
  { week: 4, latency: 126 },
  { week: 5, latency: 196 },
  { week: 6, latency: 139 },
]
const ranges = { all: weeks, recent: weeks.slice(-3) }
const rangeOptions = ['all', 'recent'] as const
const latestWeek = weeks[weeks.length - 1].week
const chartMax = 220

export function VisualizationDemo() {
  const { language } = useLanguage()
  const copy = chartCopy[language]
  const [range, setRange] = useState<Range>('all')
  const [selectedWeek, setSelectedWeek] = useState(latestWeek)
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null)
  const [focusedWeek, setFocusedWeek] = useState<number | null>(null)
  const visibleWeeks = ranges[range]
  const mean = visibleWeeks.reduce((sum, point) => sum + point.latency, 0) / visibleWeeks.length
  const formattedMean = new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(mean)
  const previewWeek = hoveredWeek ?? focusedWeek
  const activeWeek = previewWeek ?? selectedWeek
  const visibleIndex = visibleWeeks.findIndex(({ week }) => week === activeWeek)
  const activeIndex = visibleIndex < 0 ? visibleWeeks.length - 1 : visibleIndex
  const reading = visibleWeeks[activeIndex]
  const previous = visibleWeeks[activeIndex - 1]
  const delta = previous ? reading.latency - previous.latency : 0

  function changeRange(next: Range) {
    setRange(next)
    setHoveredWeek(null)
    setFocusedWeek(null)
    if (!ranges[next].some(({ week }) => week === selectedWeek)) setSelectedWeek(latestWeek)
  }

  return (
    <div className="engineer-visualization">
      <div className="engineer-chart-toolbar">
        <span>{copy.title}</span>
        <fieldset className="engineer-chart-filters" aria-label={copy.rangeLabel}>
          {rangeOptions.map((option) => (
            <button
              key={option}
              className="engineer-demo-button"
              type="button"
              aria-pressed={range === option}
              onClick={() => changeRange(option)}
            >
              {copy.ranges[option]}
            </button>
          ))}
        </fieldset>
      </div>
      <fieldset className="engineer-chart-plot" aria-label={copy.title}>
        {visibleWeeks.map(({ week, latency }) => (
          <button
            key={week}
            className="engineer-chart-week"
            type="button"
            aria-label={`${copy.week} ${week}: ${latency} ms`}
            aria-pressed={selectedWeek === week}
            data-preview={previewWeek === week}
            onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHoveredWeek(week) }}
            onPointerLeave={() => setHoveredWeek(null)}
            onFocus={() => { setFocusedWeek(week); setHoveredWeek(null) }}
            onBlur={() => setFocusedWeek(null)}
            onClick={event => {
              if (event.detail === 0) setHoveredWeek(null)
              setSelectedWeek(week)
            }}
          >
            <span className="engineer-chart-track" aria-hidden="true">
              <span className="engineer-chart-bar" style={{ height: `${latency / chartMax * 100}%` }} />
            </span>
            <span className="engineer-chart-tick" aria-hidden="true">{copy.weekShort}{week}</span>
          </button>
        ))}
      </fieldset>
      <p className="engineer-chart-mean"><span>{copy.mean}</span> <strong>{formattedMean} ms</strong></p>
      <output className="engineer-chart-reading">
        <span className="engineer-chart-reading-value">
          <span>{copy.week} {reading.week}</span>
          <strong>{reading.latency} ms</strong>
        </span>
        <span className="engineer-chart-comparison">
          {previous ? `${delta > 0 ? '+' : ''}${delta} ms ${copy.comparison}` : copy.noComparison}
        </span>
      </output>
    </div>
  )
}
