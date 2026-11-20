import { useMemo, useState } from 'react'
import { useLanguage } from '../../i18n/language'
import { AnalyticsReportChart } from './AnalyticsReportChart'
import {
  defaultReportFilters, reportCategories, reportMonths, reportPeriods, reportYear, summarizeReport,
} from './analyticsReport'
import styles from './AnalyticsReportDemo.module.css'

type ReportFilterProps<Value extends string> = {
  label: string
  value: Value
  options: readonly Value[]
  optionLabel: (option: Value) => string
  onChange: (value: Value) => void
}

function ReportFilter<Value extends string>({ label, value, options, optionLabel, onChange }: ReportFilterProps<Value>) {
  return (
    <label>
      {label}
      <select value={value} onChange={event => {
        const selected = options.find(option => option === event.currentTarget.value)
        if (selected !== undefined) onChange(selected)
      }}>
        {options.map(option => <option key={option} value={option}>{optionLabel(option)}</option>)}
      </select>
    </label>
  )
}

export function AnalyticsReportDemo() {
  const { text: { work: { report } } } = useLanguage()
  const [opened, setOpened] = useState(false)

  return (
    <details className={styles.disclosure} onToggle={event => {
      if (event.currentTarget.open) setOpened(true)
    }}>
      <summary className="ui-pill">
        {report.open}
        <span className={styles.chevron} aria-hidden="true" />
      </summary>
      {opened && <AnalyticsReport />}
    </details>
  )
}

function AnalyticsReport() {
  const { language, text: { work: { report } } } = useLanguage()
  const [filters, setFilters] = useState(defaultReportFilters)
  const { dates, shortDates, counts, averages } = useMemo(() => {
    const locale = language === 'sr' ? 'sr-Latn-RS' : 'en-US'
    return {
      dates: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }),
      shortDates: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }),
      counts: new Intl.NumberFormat(locale),
      averages: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    }
  }, [language])

  const { months, total, monthsWithData, monthlyAverage } = summarizeReport(filters)
  const chartRows = reportMonths.map(month => {
    const observation = months.find(entry => entry.month === month)
    const count = observation?.count ?? null
    const date = new Date(Date.UTC(reportYear, month))
    const countLabel = count === null ? report.noData : counts.format(count)
    return {
      month,
      inPeriod: Boolean(observation),
      label: dates.format(date),
      shortLabel: shortDates.format(date),
      count,
      countLabel: observation?.partial ? `${countLabel} ${report.partialLabel}` : countLabel,
      partial: observation?.partial ?? false,
    }
  })
  const hasResults = monthlyAverage !== null
  const formattedTotal = counts.format(total)

  return (
    <div className={styles.report}>
      <header className={styles.intro}>
        <h4>{report.title}</h4>
        <p>{report.description}</p>
        <p className={styles.provenance}>{report.provenance}</p>
      </header>

      <div className={styles.filters}>
        <ReportFilter label={report.period} value={filters.period} options={reportPeriods}
          optionLabel={period => report.periods[period](reportYear)}
          onChange={period => setFilters(current => ({ ...current, period }))} />
        <ReportFilter label={report.category} value={filters.category} options={reportCategories}
          optionLabel={category => report.categories[category]}
          onChange={category => setFilters(current => ({ ...current, category }))} />
        <button className="ui-pill" type="button" onClick={() => setFilters(defaultReportFilters)}>{report.reset}</button>
      </div>

      <div className={styles.reportOutput}>
        <output className={hasResults ? 'visually-hidden' : styles.empty}>
          {hasResults ? report.updated(formattedTotal, monthsWithData, months.length) : (
            <>
              <strong>{report.emptyTitle}</strong>{' '}
              <span>{report.emptyDescription}</span>
            </>
          )}
        </output>

        <div className={styles.resultReveal} aria-hidden={hasResults ? undefined : true}>
          <div className={styles.resultContent}>
            <dl className={styles.metrics}>
              <div><dt>{report.total}</dt><dd>{formattedTotal}</dd></div>
              <div><dt>{report.average}</dt><dd>{monthlyAverage === null ? '—' : averages.format(monthlyAverage)}</dd></div>
              <div><dt>{report.coverage}</dt><dd>{report.coverageValue(counts.format(monthsWithData), counts.format(months.length))}</dd></div>
            </dl>

            <div className={styles.results}>
              <AnalyticsReportChart rows={chartRows} hasResults={hasResults} counts={counts} text={report} />

              <table className={styles.table}>
                <caption>{report.table}</caption>
                <thead>
                  <tr><th scope="col">{report.month}</th><th scope="col">{report.total}</th></tr>
                </thead>
                <tbody>
                  {chartRows.filter(row => row.inPeriod).map(row => (
                    <tr key={row.month}>
                      <th scope="row">{row.label}</th>
                      <td>{row.countLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
