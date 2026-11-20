import type { Messages } from '../../i18n/en'
import { reportScaleMaximum } from './analyticsReport'
import styles from './AnalyticsReportDemo.module.css'

type ChartRow = {
  month: number
  inPeriod: boolean
  shortLabel: string
  count: number | null
  partial: boolean
}

type ChartProps = {
  rows: readonly ChartRow[]
  hasResults: boolean
  counts: Intl.NumberFormat
  text: Pick<Messages['work']['report'], 'chart' | 'partialNote' | 'missingNote'>
}

const ticks = [reportScaleMaximum, reportScaleMaximum / 2, 0]

export function AnalyticsReportChart({ rows, hasResults, counts, text }: ChartProps) {
  const hasPartialMonths = rows.some(row => row.partial)
  const hasMissingMonths = rows.some(row => row.inPeriod && row.count === null)

  return (
    <figure className={styles.chart}>
      <figcaption>{text.chart}</figcaption>
      <div className={styles.chartBody} aria-hidden="true">
        <div className={styles.scale}>
          {ticks.map(tick => <span key={tick}>{counts.format(tick)}</span>)}
        </div>
        <div className={styles.columns}>
          <div className={styles.rules}><span /><span /><span /></div>
          {rows.map(row => (
            <div className={styles.column} data-in-period={row.inPeriod} key={row.month}>
              <div className={styles.barTrack}>
                <span className={styles.bar} style={{ height: `${((row.count ?? 0) / reportScaleMaximum) * 100}%` }} />
                <span className={styles.missingMark} data-missing={hasResults && row.inPeriod && row.count === null}>—</span>
              </div>
              <span>{row.shortLabel}{row.partial && '*'}</span>
            </div>
          ))}
        </div>
      </div>
      {hasPartialMonths && <p className={styles.chartNote}>{text.partialNote}</p>}
      {hasResults && hasMissingMonths && <p className={styles.chartNote}>{text.missingNote}</p>}
    </figure>
  )
}
