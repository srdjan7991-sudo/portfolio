import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true })

for (const copy of [
  {
    language: 'en', open: 'Try a sample report', chart: 'Completed reports by month', table: 'Monthly data',
    reset: 'Reset filters', january: 'Quality, January 2026, Completed reports 72', may: 'Quality, May 2026, Completed reports 115',
  },
  {
    language: 'sr', open: 'Isprobaj primer izveštaja', chart: 'Završeni izveštaji po mesecima', table: 'Mesečni podaci',
    reset: 'Vrati početne filtere', january: 'Kvalitet, januar 2026., Završeni izveštaji 72', may: 'Kvalitet, maj 2026., Završeni izveštaji 115',
  },
]) {
  test(`inspects both stacked plots without covering or shifting them in ${copy.language}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('./#work')
    if (copy.language === 'sr') {
      await page.getByRole('switch', { name: 'Dark theme' }).tap()
      await page.getByRole('switch', { name: 'EN / SR, Serbian language' }).tap()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await expect(page.locator('html')).toHaveAttribute('lang', 'sr')
    }
    await page.getByText(copy.open, { exact: true }).tap()
    const chart = page.getByRole('figure', { name: copy.chart, exact: true })
    const reading = chart.locator('[data-open="true"]')
    const table = page.getByRole('table', { name: copy.table, exact: true })
    const currentCell = table.locator('[aria-current="true"]')
    await expect(chart).toBeVisible()
    const positions = () => chart.locator('[data-chart-plot]').evaluateAll(plots =>
      plots.map(plot => Math.round(plot.getBoundingClientRect().top + window.scrollY)))
    const initialPositions = await positions()
    expect(initialPositions).toHaveLength(2)

    for (const { label, count, plotTop } of [
      { label: copy.january, count: '72', plotTop: 100 },
      { label: copy.may, count: '115', plotTop: 370 },
    ]) {
      const bar = chart.getByRole('button', { name: label, exact: true })
      await expect(bar).toBeVisible()
      expect((await bar.boundingBox()).width).toBeGreaterThanOrEqual(24)
      await bar.evaluate((control, top) => {
        const plot = control.closest('[data-chart-plot]')
        window.scrollTo(0, window.scrollY + plot.getBoundingClientRect().top - top)
      }, plotTop)
      await bar.tap()

      await expect(bar).toHaveAttribute('aria-pressed', 'true')
      await expect(currentCell).toHaveText(count)
      await expect(reading).toBeInViewport()
      await expect(reading.locator('dd').first()).toHaveText(count)
      expect(await reading.evaluate(readout => {
        const box = readout.getBoundingClientRect()
        const [first, second] = readout.closest('figure').querySelectorAll('[data-chart-plot]')
        return box.top >= first.getBoundingClientRect().bottom && box.bottom <= second.getBoundingClientRect().top
      })).toBe(true)
      expect(await positions()).toEqual(initialPositions)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)

    for (const { label, count, plotTop, direction } of [
      { label: copy.january, count: '72', plotTop: 420, direction: 1 },
      { label: copy.may, count: '115', plotTop: 70, direction: -1 },
    ]) {
      const bar = chart.getByRole('button', { name: label, exact: true })
      const before = await bar.evaluate((control, top) => {
        const plot = control.closest('[data-chart-plot]')
        window.scrollTo(0, window.scrollY + plot.getBoundingClientRect().top - top)
        return window.scrollY
      }, plotTop)
      const box = await bar.boundingBox()
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
      await expect(currentCell).toHaveText(count)
      await expect(reading).toBeInViewport({ ratio: 0.99 })
      await expect.poll(() => reading.evaluate(() => window.scrollY)).not.toBe(before)
      const { top, header, scroll } = await reading.evaluate(readout => ({
        top: readout.getBoundingClientRect().top,
        header: Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart),
        scroll: window.scrollY,
      }))
      expect(top, label).toBeGreaterThanOrEqual(header - 1)
      expect((scroll - before) * direction, label).toBeGreaterThan(0)
      expect(await positions()).toEqual(initialPositions)
    }

    const january = chart.getByRole('button', { name: copy.january, exact: true })
    await page.getByRole('button', { name: copy.reset, exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(january).toBeFocused()
    await expect(reading.locator('dd').first()).toHaveText('72')
    await page.keyboard.press('Enter')
    await expect(currentCell).toHaveText('72')
    await page.keyboard.press('Escape')
    await expect(reading).toHaveCount(0)
    await expect(january).toBeFocused()
  })
}
