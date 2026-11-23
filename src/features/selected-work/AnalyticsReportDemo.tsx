import { useMemo, useState } from 'react'
import { useLanguage } from '../../i18n/language'
import { AnalyticsReportChart } from './AnalyticsReportChart'
import {
  defaultReportFilters, reportCategories, reportPeriods, reportYear, summarizeReport,
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
  const [active, setActive] = useState(false)

  return (
    <details className={styles.disclosure} onToggle={event => {
      const open = event.currentTarget.open
      if (open) setOpened(true)
      setActive(open)
    }}>
      <summary className="ui-pill">
        {report.open}
        <span className={styles.chevron} aria-hidden="true" />
      </summary>
      {opened && <AnalyticsReport active={active} />}
    </details>
  )
}

function AnalyticsReport({ active }: { active: boolean }) {
  const { language, text: { work: { report } } } = useLanguage()
  const [filters, setFilters] = useState(defaultReportFilters)
  const { dates, shortDates, periods, counts, averages, changes, percents } = useMemo(() => {
    const locale = language === 'sr' ? 'sr-Latn-RS' : 'en-US'
    return {
      dates: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }),
      shortDates: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }),
      periods: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      counts: new Intl.NumberFormat(locale),
      averages: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
      changes: new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' }),
      percents: new Intl.NumberFormat(locale, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 }),
    }
  }, [language])

  const { chartMonths, series, months, total, monthsWithData, monthlyAverage } = summarizeReport(filters)
  const chartRows = chartMonths.map(row => {
    const { month, count, partial } = row
    const date = Date.UTC(reportYear, month)
    const countLabel = count === null ? report.noData : counts.format(count)
    return {
      ...row,
      label: dates.format(date),
      shortLabel: shortDates.format(date),
      periodLabel: periods.format(date),
      previousLabel: periods.format(Date.UTC(reportYear, month - 1)),
      countLabel: partial ? `${countLabel} ${report.partialLabel}` : countLabel,
    }
  })
  const hasResults = monthlyAverage !== null
  const formattedTotal = counts.format(total)
  const grouped = series.length > 1

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
        <button className="ui-pill" type="button" onClick={() => setFilters({ ...defaultReportFilters })}>{report.reset}</button>
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

        <div className={styles.resultReveal} aria-hidden={hasResults ? undefined : true} inert={!hasResults}>
          <div className={styles.resultContent}>
            <dl className={styles.metrics}>
              <div><dt>{report.total}</dt><dd>{formattedTotal}</dd></div>
              <div><dt>{report.average}</dt><dd>{monthlyAverage === null ? '—' : averages.format(monthlyAverage)}</dd></div>
              <div><dt>{report.coverage}</dt><dd>{report.coverageValue(counts.format(monthsWithData), counts.format(months.length))}</dd></div>
            </dl>

            <div className={styles.results}>
              <AnalyticsReportChart rows={chartRows} series={series} filters={filters} active={active && hasResults}
                counts={counts} changes={changes} percents={percents} text={report} />

              <table className={styles.table}>
                <caption>{report.table}</caption>
                <thead>
                  <tr>
                    <th scope="col">{report.month}</th>
                    {grouped && series.map(key => (
                      <th scope="col" key={key} aria-label={report.categories[key]}>
                        <span className={styles.tableShort} aria-hidden="true">{report.shortCategories[key]}</span>
                        <span className={styles.tableFull} aria-hidden="true">{report.categories[key]}</span>
                      </th>
                    ))}
                    <th scope="col">{report.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {chartRows.filter(row => row.inPeriod).map(row => (
                    <tr key={row.month}>
                      <th scope="row">{row.label}</th>
                      {grouped && series.map(key => {
                        const point = row.points[key]
                        return <td key={key}>{point ? counts.format(point.count) : (
                          <><span aria-hidden="true">—</span><span className="visually-hidden">{report.noData}</span></>
                        )}</td>
                      })}
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
