import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Messages } from '../../i18n/en'
import { reportScaleMaximum, reportSeries } from './analyticsReport'
import type { ReportFilters, ReportPoint, ReportSeries, summarizeReport } from './analyticsReport'
import { useReportTooltipPosition } from './useReportTooltipPosition'
import styles from './AnalyticsReportDemo.module.css'

type ChartRow = ReturnType<typeof summarizeReport>['chartMonths'][number] & {
  shortLabel: string
  periodLabel: string
  previousLabel: string
}

type ChartProps = {
  rows: readonly ChartRow[]
  series: readonly ReportSeries[]
  filters: ReportFilters
  active: boolean
  counts: Intl.NumberFormat
  changes: Intl.NumberFormat
  percents: Intl.NumberFormat
  text: Messages['work']['report']
}

type Source = 'hover' | 'focus' | 'activation'
type Target = {
  month: number
  series: ReportSeries
  anchor: HTMLButtonElement
  source: Source
}
type Inspection = { scope: object; entries: readonly Target[]; last: Target }

const ticks = [0, 1, 2, 3, 4].map(index => reportScaleMaximum * (1 - index / 4))

function Scale({ counts, className }: { counts: Intl.NumberFormat; className: string }) {
  return <div className={className} aria-hidden="true">{ticks.map(tick => <span key={tick}>{counts.format(tick)}</span>)}</div>
}

function formatChange(point: ReportPoint, { changes, percents, text }: ChartProps) {
  if (!point.change) return text.noComparison
  const { amount, rate } = point.change
  const percent = rate === null ? text.noPercent : percents.format(rate)
  return `${changes.format(amount)} (${percent})`
}

export function AnalyticsReportChart(props: ChartProps) {
  const { rows, series, filters, active, counts, text } = props
  const id = useId()
  const figure = useRef<HTMLElement>(null)
  const tooltip = useRef<HTMLDivElement>(null)
  const scope = useMemo(() => ({ filters, active }), [filters, active])
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const current = inspection?.scope === scope && active ? inspection : null
  const selected = current?.entries[0] ?? current?.last
  const selectedRow = selected && rows.find(row => row.month === selected.month)
  const selectedPoint = selected && selectedRow?.points[selected.series]
  const open = Boolean(current?.entries.length && selectedPoint)

  useReportTooltipPosition(figure, tooltip, open ? selected?.anchor : undefined)

  const dismiss = useCallback((...sources: Source[]) => {
    setInspection(current => {
      if (!current?.entries.length) return current
      const entries = sources.length ? current.entries.filter(entry => !sources.includes(entry.source)) : []
      if (entries.length === current.entries.length) return current
      return { ...current, entries, last: current.entries[0] }
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const container = figure.current
    let hoverExit: number | undefined
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss()
    }
    function onOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !container?.contains(event.target)) dismiss()
    }
    function onLeave() {
      window.clearTimeout(hoverExit)
      dismiss('hover')
    }
    function onPointerOver(event: PointerEvent) {
      if (event.pointerType === 'touch' || !(event.target instanceof Element)) return
      window.clearTimeout(hoverExit)
      if (!event.target.closest('[data-report-point]') && !tooltip.current?.contains(event.target)) {
        // Allow the pointer to cross the gap into the tooltip.
        hoverExit = window.setTimeout(() => dismiss('hover'), 160)
      }
    }
    function onFocusOut(event: FocusEvent) {
      if (!(event.relatedTarget instanceof Node) || !container?.contains(event.relatedTarget)) dismiss('focus', 'activation')
    }
    document.addEventListener('keydown', onEscape)
    document.addEventListener('pointerdown', onOutsidePointer)
    container?.addEventListener('pointerleave', onLeave)
    container?.addEventListener('pointerover', onPointerOver)
    container?.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('keydown', onEscape)
      document.removeEventListener('pointerdown', onOutsidePointer)
      window.clearTimeout(hoverExit)
      container?.removeEventListener('pointerleave', onLeave)
      container?.removeEventListener('pointerover', onPointerOver)
      container?.removeEventListener('focusout', onFocusOut)
    }
  }, [open, dismiss])

  function inspect(anchor: HTMLButtonElement, month: number, key: ReportSeries, source: Source) {
    setInspection(current => {
      const entries = current?.scope === scope ? current.entries : []
      const target = { month, series: key, anchor, source }
      if (source === 'activation' && entries.some(entry => entry.source === 'activation' && entry.anchor === anchor)) {
        return { scope, entries: [], last: entries[0] }
      }
      const otherSources = entries.filter(entry => entry.source !== source &&
        !(source === 'focus' && entry.source === 'activation' && entry.anchor !== anchor))
      return { scope, entries: [target, ...otherSources], last: target }
    })
  }

  const plots = [rows.slice(0, 3), rows.slice(3)].filter(months => months.length > 0)
  const hasPartialMonths = rows.some(row => row.partial)
  const hasMissing = rows.some(row => row.inPeriod && series.some(key => row.points[key] === null))

  return (
    <figure ref={figure} className={styles.chart} aria-labelledby={`${id}-chart`}>
      <figcaption id={`${id}-chart`}>{text.chart}</figcaption>
      <ul className={styles.legend}>
        {series.map(key => <li key={key} data-series={key}><span aria-hidden="true" />{text.categories[key]}</li>)}
      </ul>
      <p className={styles.chartHint}>{text.chartHint}</p>
      <div className={styles.chartBody}>
        <Scale counts={counts} className={`${styles.scale} ${styles.sharedScale}`} />
        {plots.map(months => (
          <div className={styles.plot} data-in-period={months.some(row => row.inPeriod)} key={months[0].month}>
            <Scale counts={counts} className={`${styles.scale} ${styles.localScale}`} />
            <div className={styles.columns} data-chart-plot>
              <div className={styles.rules} aria-hidden="true">{ticks.map(tick => <span key={tick} />)}</div>
              {months.map(row => (
                <div className={styles.column} data-in-period={row.inPeriod} key={row.month}>
                  <div className={styles.barTrack} data-bar-group>
                    {reportSeries.map(key => {
                      const point = row.points[key]
                      const enabled = active && point !== null
                      const highlight = open && selected?.month === row.month && selected.series === key
                      const descriptionId = `${id}-${row.month}-${key}`
                      return (
                        <div className={styles.mark} data-series={key} data-selected={series.includes(key)} key={key}
                          aria-hidden={enabled ? undefined : true}>
                          <button type="button" className={styles.barButton} disabled={!enabled} data-highlight={highlight}
                            data-report-point={enabled ? '' : undefined}
                            aria-label={point ? `${text.categories[key]}, ${row.periodLabel}, ${text.total} ${counts.format(point.count)}` : undefined}
                            aria-describedby={enabled ? descriptionId : undefined}
                            onPointerEnter={event => {
                              if (enabled && event.pointerType !== 'touch') inspect(event.currentTarget, row.month, key, 'hover')
                            }}
                            onFocus={event => inspect(event.currentTarget, row.month, key, 'focus')}
                            onClick={event => inspect(event.currentTarget, row.month, key, 'activation')}>
                            <span className={styles.bar} data-zero={point?.count === 0} aria-hidden="true"
                              style={{ height: `${((point?.count ?? 0) / reportScaleMaximum) * 100}%` }} />
                          </button>
                          {enabled && point && <span hidden id={descriptionId}>
                            {`${text.previousMonth(row.previousLabel)}. ${formatChange(point, props)}`}
                          </span>}
                          <span className={styles.missingMark} aria-hidden="true"
                            data-missing={active && row.inPeriod && series.includes(key) && point === null}>—</span>
                        </div>
                      )
                    })}
                  </div>
                  <span aria-hidden="true">{row.shortLabel}{row.partial && '*'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {selected && selectedRow && selectedPoint && (
        <div ref={tooltip} className={styles.tooltip} data-open={open} data-hoverable={selected.source === 'hover'} aria-hidden="true">
          <div className={styles.tooltipCard}>
            <div className={styles.tooltipHeader}>
              <strong className={styles.tooltipTitle} data-series={selected.series}><span />{text.categories[selected.series]}</strong>
              <p className={styles.tooltipPeriod}>{selectedRow.periodLabel}</p>
            </div>
            <dl>
              <div><dt>{text.total}</dt><dd>{counts.format(selectedPoint.count)}</dd></div>
              <div><dt>{text.previousMonth(selectedRow.previousLabel)}</dt><dd>{formatChange(selectedPoint, props)}</dd></div>
            </dl>
          </div>
        </div>
      )}
      {hasPartialMonths && <p className={styles.chartNote}>{text.partialNote}</p>}
      {active && hasMissing && <p className={styles.chartNote}>{text.missingNote}</p>}
    </figure>
  )
}
