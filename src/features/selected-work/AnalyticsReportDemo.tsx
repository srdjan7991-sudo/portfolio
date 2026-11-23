import { useMemo, useRef, useState } from 'react'
import { useLanguage } from '../../i18n/language'
import { AnalyticsReportChart } from './AnalyticsReportChart'
import { AnalyticsReportComparison, AnalyticsReportCoverage } from './AnalyticsReportContext'
import {
  defaultReportFilters, reportCategories, reportPeriods, reportYear, summarizeReport,
} from './analyticsReport'
import type { Observation, ReportFilters } from './analyticsReport'
import { ReportFilter } from './ReportFilter'
import { reportContextCopy } from './reportContextCopy'
import styles from './AnalyticsReportDemo.module.css'

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
  const copy = reportContextCopy[language]
  const [filters, setFilters] = useState(defaultReportFilters)
  const [pinned, setPinned] = useState<Observation | null>(null)
  const tableCaption = useRef<HTMLTableCaptionElement>(null)
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
  const visibleRows = chartRows.filter(row => row.inPeriod)
  const pinnedRow = pinned && visibleRows.find(row => row.month === pinned.month)
  const pinnedValue = pinned && pinnedRow ? pinnedRow.points[pinned.series]?.count : undefined

  function changeFilters(next: ReportFilters) {
    setFilters(next)
    setPinned(null)
  }

  function togglePin(point: Observation) {
    setPinned(current => current?.month === point.month && current.series === point.series ? null : point)
  }

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
          onChange={period => changeFilters({ ...filters, period })} />
        <ReportFilter label={report.category} value={filters.category} options={reportCategories}
          optionLabel={category => report.categories[category]}
          onChange={category => changeFilters({ ...filters, category })} />
        <button className="ui-pill" type="button" onClick={() => changeFilters(defaultReportFilters)}>{report.reset}</button>
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
                counts={counts} changes={changes} percents={percents} text={report}
                pinned={pinned} pinHint={copy.pinHint} onPin={togglePin} />

              <AnalyticsReportCoverage rows={visibleRows} series={series} />

              <div className={styles.tablePanel}>
                <div className={styles.pinPanel} hidden={!pinned}>
                  <p aria-live="polite">{pinned && pinnedRow && pinnedValue !== undefined && (
                    <>{copy.pinned} · {pinnedRow.periodLabel} · {report.categories[pinned.series]} · <strong>{counts.format(pinnedValue)}</strong></>
                  )}</p>
                  <button type="button" className="ui-pill" onClick={() => {
                    setPinned(null)
                    tableCaption.current?.focus({ preventScroll: true })
                  }}>{copy.clearPin}</button>
                </div>
                <table className={styles.table}>
                  <caption ref={tableCaption} tabIndex={-1}>{report.table}</caption>
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
                    {visibleRows.map(row => (
                      <tr key={row.month}>
                        <th scope="row">{row.label}</th>
                        {grouped && series.map(key => {
                          const point = row.points[key]
                          const current = pinned?.month === row.month && pinned.series === key
                          return (
                            <td aria-current={current || undefined} key={key}>
                              {point ? counts.format(point.count) : (
                                <><span aria-hidden="true">—</span><span className="visually-hidden">{report.noData}</span></>
                              )}
                            </td>
                          )
                        })}
                        <td aria-current={(!grouped && pinned?.month === row.month) || undefined}>{row.countLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AnalyticsReportComparison rows={visibleRows} series={series} counts={counts} changes={changes} percents={percents} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
