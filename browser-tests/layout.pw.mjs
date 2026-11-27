import { expect, test } from '@playwright/test'

const clamp = (minimum, value, maximum) => Math.max(minimum, Math.min(value, maximum))
const near = (actual, expected) => expect(actual).toBeCloseTo(expected, 0)

const extractions = {
  'Hero introduction': '.hero-intro',
  'Hero architecture': '.living-shell',
  'Request introduction': '#request-flow-title',
  'Request diagram': '[data-request-cross-section] figure > :first-child',
  'Request diagram controls': '[data-request-cross-section] figcaption',
  'Selected Work': '#work',
  'Case study': '.selected-work-case-details',
  'Mede illustration': '.selected-work-preview',
  'Experience timeline': '.experience-timeline',
  'Education credentials': '.education-credentials',
  'Engineering index': '#expertise .engineer',
  'Header brand': 'body > #root > header a[href="#top"]',
  'Footer content': 'footer > .container',
}

for (const viewportWidth of [1440, 1280, 1024, 768, 390, 320]) {
  test('composes the public sections at ' + viewportWidth + ' px in both languages and themes', async ({ page }) => {
    await page.setViewportSize({ width: viewportWidth, height: 900 })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('./#work')
    await page.evaluate(() => document.fonts.ready)
    await page.getByText('Read the case study', { exact: true }).click()
    await page.getByText('Try a sample report', { exact: true }).click()

    async function check(monthlyData, reportName) {
      const report = page.getByRole('figure', { name: reportName, exact: true })
      await expect(report).toBeVisible()
      const layout = await report.evaluate((chart, selectors) => {
        const box = node => {
          const { x, y, width, right } = node.getBoundingClientRect()
          return { x, y, width, right }
        }
        const spans = Object.fromEntries(Object.entries(selectors).map(([name, selector]) =>
          [name, box(document.querySelector(selector))]))
        const results = chart.parentElement
        const report = chart.closest('details').querySelector('summary + div')
        const plots = Array.from(chart.querySelectorAll('[data-chart-plot]'))
        return {
          ...spans, report: box(report), chart: box(chart), plots: plots.map(box),
          viewport: document.documentElement.clientWidth,
          viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
          caseRows: Array.from(document.querySelectorAll('.selected-work-case-details > div')).map(box),
          resultColumns: getComputedStyle(results).gridTemplateColumns.split(' ').length,
          reportContentWidth: report.clientWidth - parseFloat(getComputedStyle(report).paddingInlineStart) -
            parseFloat(getComputedStyle(report).paddingInlineEnd),
        }
      }, extractions)
      const { viewport, documentWidth } = layout
      const standard = Math.min(viewport - clamp(20, layout.viewportWidth * 0.048, 72) * 2, 1280)
      const wide = Math.min(viewport - clamp(16, layout.viewportWidth * 0.028, 40) * 2, 1472)
      const full = Math.min(viewport - clamp(12, layout.viewportWidth * 0.01875, 24) * 2, 1664)

      expect(documentWidth).toBe(viewport)
      for (const key of ['Hero introduction', 'Request diagram controls', 'Selected Work', 'Engineering index', 'Footer content']) {
        near(layout[key].width, standard)
        near(layout[key].x, (viewport - standard) / 2)
      }
      near(layout['Request introduction'].x, layout['Selected Work'].x)
      // The existing compact mobile header leaves more room for its controls below 22rem.
      near(layout['Header brand'].x, viewportWidth <= 352 ? 8.8 : layout['Selected Work'].x)
      near(layout['Hero architecture'].width, wide)
      const diagramWidth = viewportWidth <= 576 ? standard : full
      near(layout['Request diagram'].width, diagramWidth)
      near(layout['Request diagram'].x, (viewport - diagramWidth) / 2)
      near(layout.report.width, wide)
      near(layout.report.x, (viewport - wide) / 2)
      expect(layout.chart.width).toBeLessThan(layout.report.width)
      expect(layout.plots).toHaveLength(2)
      if (viewportWidth <= 390) expect(layout.plots[1].y).toBeGreaterThan(layout.plots[0].y)
      else near(layout.plots[1].y, layout.plots[0].y)

      expect(layout.resultColumns).toBe(layout.reportContentWidth >= 928 ? 2 : 1)
      expect(layout['Case study'].width).toBeLessThanOrEqual(992)
      near(layout['Case study'].x, layout['Selected Work'].x)
      if (viewportWidth >= 1024) {
        near(layout.caseRows[1].y, layout.caseRows[0].y)
        expect(layout.caseRows[1].x).toBeGreaterThan(layout.caseRows[0].x)
      } else expect(layout.caseRows[1].y).toBeGreaterThan(layout.caseRows[0].y)

      expect(layout['Mede illustration'].width).toBeLessThanOrEqual(512)
      expect(layout['Experience timeline'].width).toBeLessThanOrEqual(864)
      expect(layout['Experience timeline'].x - layout['Selected Work'].x).toBeLessThan(8)
      expect(layout['Education credentials'].width).toBeLessThanOrEqual(1024)
      if (viewportWidth >= 1280) expect(layout['Education credentials'].x).toBeGreaterThan(layout['Selected Work'].x)
      else near(layout['Education credentials'].x, layout['Selected Work'].x)

      const table = page.getByRole('table', { name: monthlyData, exact: true })
      await expect(table).toBeVisible()
      const bounds = await table.boundingBox()
      expect(bounds.x).toBeGreaterThanOrEqual(layout.report.x)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(layout.report.right)
    }

    await check('Monthly data', 'Completed reports by month')
    await page.getByRole('switch', { name: 'Dark theme' }).click()
    await page.getByRole('switch', { name: 'EN / SR, Serbian language' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('lang', 'sr')
    await check('Mesečni podaci', 'Završeni izveštaji po mesecima')
  })
}

test('keeps the active workspace usable across the former sidebar breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./#expertise')
  const architecture = page.getByRole('button', { name: /Application Architecture/ })
  await architecture.press('Enter')
  await expect(page.getByRole('heading', { name: 'Application Architecture', exact: true })).toBeFocused()
  await page.getByRole('tab', { name: 'Separation of concerns' }).press('ArrowRight')
  const modules = page.getByRole('tabpanel', { name: 'Module boundaries' })
  await expect(modules.getByRole('button', { name: 'Service' })).toHaveAttribute('aria-pressed', 'true')

  for (const width of [1440, 1280, 1024, 849, 848, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    const { width: demoWidth, sideBySide, scrollWidth, clientWidth } = await modules.evaluate(panel => {
      const notes = panel.querySelector('.engineer-concept-notes').getBoundingClientRect()
      const demo = panel.querySelector('.engineer-demo').getBoundingClientRect()
      return { width: demo.width, sideBySide: Math.abs(notes.y - demo.y) < 1,
        scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }
    })
    expect(scrollWidth).toBe(clientWidth)
    if (width >= 1024) expect(demoWidth).toBeGreaterThanOrEqual(640)
    if (demoWidth < 640) expect(sideBySide).toBe(false)
    if (width === 848 || width === 849) expect(sideBySide).toBe(false)
  }
  await page.getByRole('button', { name: 'All areas' }).press('Enter')
  await expect(architecture).toBeFocused()

  for (const [area, first, next] of [
    ['Frontend Engineering', 'Component architecture', 'Reusable UI'],
    ['Data Visualization', 'Dashboard context', 'Readable data'],
    ['API Integration', 'REST clients', 'Asynchronous state'],
    ['Testing & Quality', 'Component tests', 'Integration tests'],
  ]) {
    const opener = page.locator('#expertise').getByRole('button', { name: new RegExp(area) })
    await opener.press('Enter')
    await page.getByRole('tab', { name: first }).press('ArrowRight')
    await expect(page.getByRole('tabpanel', { name: next })).toBeVisible()
    await expect(page.getByRole('tab', { name: next })).toBeFocused()
    await page.getByRole('button', { name: 'All areas' }).press('Enter')
    await expect(opener).toBeFocused()
  }
})
