import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

const edge = 6

export function useReportTooltipPosition(
  figure: RefObject<HTMLElement | null>,
  tooltip: RefObject<HTMLDivElement | null>,
  anchor: HTMLButtonElement | undefined,
) {
  useLayoutEffect(() => {
    const container = figure.current
    const panel = tooltip.current
    if (!container || !panel || !anchor) return

    const viewport = window.visualViewport
    const plot = anchor.closest('[data-chart-plot]')
    let frame = 0

    const place = () => {
      frame = 0
      const bounds = container.getBoundingClientRect()
      const bar = anchor.getBoundingClientRect()
      const screenLeft = viewport?.offsetLeft ?? 0
      const screenTop = viewport?.offsetTop ?? 0
      const screenRight = screenLeft + (viewport?.width ?? document.documentElement.clientWidth)
      const screenBottom = screenTop + (viewport?.height ?? window.innerHeight)
      const left = Math.max(bounds.left, screenLeft) + edge
      const header = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0
      const top = Math.max(bounds.top, screenTop + header) + edge
      const right = Math.min(bounds.right, screenRight) - edge
      const bottom = Math.min(bounds.bottom, screenBottom) - edge
      const { width, height } = panel.getBoundingClientRect()

      const fits = right - left >= width && bottom - top >= height && bar.width > 0
      if (!fits) {
        panel.setAttribute('data-positioned', 'false')
        return
      }

      const x = Math.min(right - width, Math.max(left, (bar.left + bar.right - width) / 2))
      const area = plot?.getBoundingClientRect() ?? bar
      const clampY = (y: number) => Math.min(bottom - height, Math.max(top, y))
      const barOverlap = (y: number) => Math.max(0, Math.min(bar.bottom, y + height) - Math.max(bar.top, y))
      const above = clampY(area.top - height - edge)
      const below = clampY(area.bottom + edge)
      const y = barOverlap(below) < barOverlap(above) ? below : above
      panel.style.setProperty('--tooltip-x', `${x - bounds.left}px`)
      panel.style.setProperty('--tooltip-y', `${y - bounds.top}px`)
      panel.setAttribute('data-positioned', 'true')
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(place)
    }

    place()
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
    for (const element of [container, panel, anchor]) resize?.observe(element)
    const barGroup = anchor.closest('[data-bar-group]')
    if (barGroup && resize) {
      resize.observe(barGroup)
      for (const mark of barGroup.children) resize.observe(mark)
    }
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)

    return () => {
      resize?.disconnect()
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
    }
  }, [anchor, figure, tooltip])
}
