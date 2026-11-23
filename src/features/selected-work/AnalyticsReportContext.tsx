import { useId, useState } from 'react'
import { useLanguage } from '../../i18n/language'
import { compareReportCounts, reportScaleMaximum } from './analyticsReport'
import type { ReportSeries, summarizeReport } from './analyticsReport'
import { ReportFilter } from './ReportFilter'
import { reportContextCopy } from './reportContextCopy'
import styles from './AnalyticsReportDemo.module.css'

type ContextRow = ReturnType<typeof summarizeReport>['months'][number] & {
  label: string
  shortLabel: string
  periodLabel: string
}

type ContextProps = { rows: readonly ContextRow[]; series: readonly ReportSeries[] }

export function AnalyticsReportCoverage({ rows, series }: ContextProps) {
  const { language, text: { work: { report } } } = useLanguage()
  const copy = reportContextCopy[language]
  const titleId = useId()

  return (
    <section className={styles.coverage} aria-labelledby={titleId}>
      <h5 id={titleId}>{copy.monthCoverage}</h5>
      <p>{copy.coverageHint}</p>
      <table className={styles.coverageTable} aria-labelledby={titleId}>
        <thead>
          <tr>
            <th scope="col"><span className="visually-hidden">{report.category}</span></th>
            {rows.map(row => <th scope="col" key={row.month} aria-label={row.label}>{row.shortLabel}</th>)}
          </tr>
        </thead>
        <tbody>
          {series.map(key => (
            <tr key={key}>
              <th scope="row" aria-label={report.categories[key]}>
                <span className={styles.tableShort} aria-hidden="true">{report.shortCategories[key]}</span>
                <span className={styles.tableFull} aria-hidden="true">{report.categories[key]}</span>
              </th>
              {rows.map(row => {
                const point = row.points[key]
                const kind = point === null ? 'missing' : point.count === 0 ? 'zero' : 'reported'
                return (
                  <td key={row.month}>
                    <span className={styles.coverageMark} data-kind={kind} aria-hidden="true" />
                    <span className="visually-hidden">{copy[kind]}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className={styles.coverageLegend}>
        {(['reported', 'zero', 'missing'] as const).map(kind => (
          <li key={kind}>
            <span className={styles.coverageMark} data-kind={kind} aria-hidden="true" />
            {copy[kind]}
          </li>
        ))}
      </ul>
    </section>
  )
}

type ComparisonProps = ContextProps & {
  counts: Intl.NumberFormat
  changes: Intl.NumberFormat
  percents: Intl.NumberFormat
}

export function AnalyticsReportComparison({ rows, series, counts, changes, percents }: ComparisonProps) {
  const { language, text: { work: { report } } } = useLanguage()
  const copy = reportContextCopy[language]
  const [preferredSeries, selectSeries] = useState<ReportSeries>('quality')
  const [from, selectFrom] = useState<number>()
  const [to, selectTo] = useState<number>()
  const category = series.includes(preferredSeries) ? preferredSeries : series[0]
  const measured = rows.filter(row => row.points[category] !== null)
  const first = rows.find(row => row.month === from) ?? measured[0] ?? rows[0]
  const last = rows.find(row => row.month === to) ?? measured.at(-1) ?? rows.at(-1) ?? first
  const initial = first.points[category]?.count ?? null
  const next = last.points[category]?.count ?? null
  const change = first.month === last.month ? null : compareReportCounts(initial, next)
  const unavailable = first.month === last.month ? copy.sameMonth
    : initial === null && next === null ? copy.missingMonths
    : initial === null ? copy.missingMonth(first.periodLabel) : copy.missingMonth(last.periodLabel)
  const options = rows.map(row => row.month)
  const monthLabel = (month: number) => rows.find(row => row.month === month)?.periodLabel ?? ''

  return (
    <details className={styles.comparison}>
      <summary>{copy.compare}</summary>
      <div className={styles.comparisonBody}>
        <div className={`${styles.filters} ${styles.comparisonFilters}`}>
          <ReportFilter label={copy.compareCategory} value={category} options={series}
            optionLabel={key => report.categories[key]} onChange={selectSeries} />
          <ReportFilter label={copy.from} value={first.month} options={options}
            optionLabel={monthLabel} onChange={selectFrom} />
          <ReportFilter label={copy.to} value={last.month} options={options}
            optionLabel={monthLabel} onChange={selectTo} />
        </div>
        <figure className={styles.comparisonPlot}>
          <figcaption>{copy.scale} <span dir="ltr">0–{counts.format(reportScaleMaximum)}</span></figcaption>
          <dl>
            {([[first, initial], [last, next]] as const).map(([row, value], index) => (
              <div key={index} className={styles.comparisonRow}>
                <dt>{row.periodLabel}</dt>
                <dd>
                  <span className={styles.comparisonTrack} aria-hidden="true">
                    {value !== null && <span className={styles.comparisonBar} data-zero={value === 0}
                      style={{ inlineSize: `${value / reportScaleMaximum * 100}%` }} />}
                  </span>
                  <strong>{value === null ? report.noData : counts.format(value)}</strong>
                </dd>
              </div>
            ))}
          </dl>
        </figure>
        <p className={styles.comparisonResult} aria-live="polite" aria-atomic="true">
          {change ? (
            <>
              <strong>{copy.difference} <bdi>{changes.format(change.amount)}</bdi></strong>
              {' '}
              <span>{change.rate === null ? copy.zeroBase : percents.format(change.rate)}</span>
            </>
          ) : unavailable}
        </p>
      </div>
    </details>
  )
}
