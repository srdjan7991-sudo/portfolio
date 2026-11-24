import { expect, test } from '@playwright/test'

const action = (page, name) => page.getByRole('button', { name, exact: true })
const reportPoint = (page, category) => page.getByRole('button', { name: new RegExp(`${category}, May 2026`) })
const openTooltip = page => page.locator('[data-hoverable][data-open="true"][data-positioned="true"]')

async function openReport(page) {
  await page.getByText('Try a sample report', { exact: true }).click()
  await expect(page.getByRole('table', { name: 'Monthly data' })).toBeVisible()
}

async function openLiveWalkthrough(page, baseURL) {
  // Keep the browser on HTTPS to exercise the application's live-mode entry point.
  // Assets come from the local preview. Only API results use fixtures.
  const origin = 'https://portfolio.test'
  await page.route(`${origin}/**`, async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/sections') {
      return route.fulfill({ json: [{ key: 'expertise', title: 'How I Engineer', body: 'Published section' }] })
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 401 })
    const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href, maxRedirects: 0 })
    return route.fulfill({ response })
  })
  await page.goto(`${origin}/portfolio/`)
  await action(page, 'Explore the request').click()
  await action(page, 'Open walkthrough').click()
  await expect(page.getByText('Live request', { exact: true })).toBeVisible()
}

test('keyboard focus holds a live response until playback resumes', async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await openLiveWalkthrough(page, baseURL)
  await page.clock.install()
  await action(page, 'Play').click()

  for (const phase of ['02 · Communication', '03 · Processing', '04 · Database', '05 · Response']) {
    await page.clock.fastForward(4_100)
    await expect(page.getByText(phase, { exact: true })).toBeVisible()
  }

  const response = page.getByRole('region', { name: 'Server response' })
  await expect(response).toContainText('Published section')
  await action(page, 'Replay').focus()
  for (let tab = 0; tab < 4 && !await response.evaluate(el => el === document.activeElement); tab++) {
    await page.keyboard.press('Tab')
  }
  await expect(response).toBeFocused()
  await expect(response).toHaveCSS('opacity', '1')
  await expect(response).toHaveCSS('animation-name', 'none')
  await expect(action(page, 'Play')).toBeVisible()
  await page.clock.fastForward(8_000)
  await expect(response).toBeFocused()
  await expect(page.getByText('05 · Response', { exact: true })).toBeVisible()

  await action(page, 'Play').click()
  await page.clock.fastForward(4_100)
  await expect(page.getByText('06 · Result', { exact: true })).toBeVisible()
})

test('Skills restores a modified visit after reload, Back and Forward', async ({ page }) => {
  await page.goto('./#experience-kterio')
  const source = page.locator('#experience-kterio').locator('xpath=ancestor::li').getByRole('link', { name: 'C#', exact: true })
  await source.click()
  await expect(page).toHaveURL(/#skill-c-sharp$/)
  await expect(page.getByRole('heading', { name: 'C#', exact: true, level: 4 })).toBeFocused()

  await action(page.locator('.skills-relations'), '.NET').click()
  await expect(page).toHaveURL(/#skills$/)
  const restored = page.getByRole('heading', { name: '.NET', exact: true, level: 4 })
  await expect(restored).toBeFocused()
  await page.reload()
  await expect(restored).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/#experience-kterio$/)
  await expect(source).toBeFocused()
  await page.goForward()
  await expect(page).toHaveURL(/#skills$/)
  await expect(restored).toBeFocused()
})

for (const [height, plotTop] of [[900, 330], [420, 96], [420, -48]]) {
  test(`chart readout stays hoverable with the plot at ${plotTop}px in a ${height}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height })
    await page.goto('./')
    await openReport(page)
    const quality = reportPoint(page, 'Quality')
    await quality.evaluate((el, top) => {
      window.scrollBy({ top: el.closest('[data-chart-plot]').getBoundingClientRect().top - top, behavior: 'instant' })
    }, plotTop)

    const source = await quality.boundingBox()
    const sourceX = source.x + source.width / 2
    await page.mouse.move(sourceX, source.y + source.height * 0.7)
    const readout = openTooltip(page)
    await expect(readout).toContainText('115')
    const panel = await readout.boundingBox()
    expect(panel.y).toBeGreaterThanOrEqual(0)
    expect(panel.y + panel.height).toBeLessThanOrEqual(height)

    await page.mouse.move(sourceX, panel.y + panel.height / 2, { steps: 6 })
    await page.mouse.move(panel.x + panel.width - 12, panel.y + panel.height - 12, { steps: 6 })
    await expect(readout).toContainText('115')

    const utilization = reportPoint(page, 'Utilization')
    const reachableNeighbor = await utilization.evaluate(button => {
      const box = button.querySelector('[data-zero]').getBoundingClientRect()
      const x = box.left + box.width / 2
      for (let y = Math.min(innerHeight, box.bottom) - 8; y > Math.max(0, box.top); y -= 8) {
        if (button.contains(document.elementFromPoint(x, y))) return { x, y }
      }
    })
    expect(reachableNeighbor).toBeDefined()
    await page.mouse.move(reachableNeighbor.x, reachableNeighbor.y)
    await expect(readout).toContainText('77')
    await page.mouse.move(0, 0)
    await quality.focus()
    await expect(readout).toContainText('115')
    await page.keyboard.press('Space')
    await expect(quality).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(readout).toHaveCount(0)
    await expect(quality).toBeFocused()
  })
}

test.describe('touch chart', () => {
  test.use({ viewport: { width: 390, height: 744 }, isMobile: true, hasTouch: true })

  test('adjacent bars expose and mark their own value on tap', async ({ page }) => {
    await page.goto('./')
    await openReport(page)
    const quality = reportPoint(page, 'Quality')
    const utilization = reportPoint(page, 'Utilization')
    await quality.tap()
    await expect(openTooltip(page)).toContainText('115')
    await expect(quality).toHaveAttribute('aria-pressed', 'true')
    await utilization.tap()
    await expect(openTooltip(page)).toContainText('77')
    await expect(quality).toHaveAttribute('aria-pressed', 'false')
    await expect(utilization).toHaveAttribute('aria-pressed', 'true')
  })
})
