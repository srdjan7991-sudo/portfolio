import { expect, test as base } from '@playwright/test'

const button = (page, name) => page.getByRole('button', { name, exact: true })

const test = base.extend({
  page: async ({ page }, use) => {
    const apiRequests = []
    const errors = []
    page.on('request', request => {
      if (/^\/api(?:\/|$)/.test(new URL(request.url()).pathname)) apiRequests.push(request.url())
    })
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.route('**/api/**', route => route.abort())
    await use(page)
    expect(apiRequests, 'The public portfolio does not contact a backend').toEqual([])
    expect(errors, 'The public portfolio loads and operates without browser errors').toEqual([])
  },
})

test('keeps the Hero and all six request stages interactive without a live response', async ({ page }) => {
  await page.goto('./')
  await button(page, 'Pin first task').click()
  await expect(page.getByRole('list', { name: 'Review queue' })).toContainText('Pinned')
  await button(page, 'Refresh queue').click()
  await expect(page.getByText('Revision 2', { exact: true })).toBeVisible()

  await button(page, 'Explore the request').click()
  await button(page, 'Open walkthrough').click()
  await expect(page.getByText('This walkthrough uses example content. The steps leave time to read.', { exact: true })).toBeVisible()
  await expect(page.getByText('Live request', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Your browser' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Application server' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Database' })).toBeVisible()

  await page.clock.install()
  await button(page, 'Play').click()
  await button(page, 'Pause').click()
  await page.clock.fastForward(8_000)
  await expect(page.getByText('01 · Interaction', { exact: true })).toBeVisible()
  await button(page, 'Play').click()
  await page.clock.fastForward(4_100)
  await expect(page.getByText('02 · Communication', { exact: true })).toBeVisible()
  for (const phase of ['03 · Processing', '04 · Database', '05 · Response', '06 · Result']) {
    await button(page, 'Next step').click()
    await expect(page.getByText(phase, { exact: true })).toBeVisible()
    await expect(page.locator('#request-flow pre')).toHaveCount(0)
    await expect(page.locator('#request-flow').getByText(/\bHTTP [245]\d\d\b/)).toHaveCount(0)
  }
  await button(page, 'Previous step').click()
  await expect(page.getByText('05 · Response', { exact: true })).toBeVisible()
  await button(page, 'Replay').click()
  await expect(page.getByText('01 · Interaction', { exact: true })).toBeVisible()
  await expect(button(page, 'Pause')).toBeVisible()
})

test.describe('mobile portfolio', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('supports mobile themes, Serbian, the analytics demo and CV download', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('./')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Software Engineer')
    const theme = page.getByRole('switch', { name: 'Dark theme' })
    await expect(theme).toHaveAttribute('aria-checked', 'false')
    await theme.tap()
    await expect(theme).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('switch', { name: 'EN / SR, Serbian language' }).tap()
    await expect(page.locator('html')).toHaveAttribute('lang', 'sr')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Softverski inženjer')

    await button(page, 'Meni').tap()
    const nav = page.getByRole('navigation', { name: 'Glavna navigacija' })
    await nav.getByRole('link', { name: 'Projekti', exact: true }).tap()
    await expect(page).toHaveURL(/#work$/)
    await expect(nav).toBeHidden()
    await page.getByText('Isprobaj primer izveštaja', { exact: true }).tap()
    const period = page.getByRole('combobox', { name: 'Period izveštaja' })
    const category = page.getByRole('combobox', { name: 'Kategorija izveštaja' })
    await period.selectOption('secondQuarter')
    await category.selectOption('operations')
    await expect(page.getByRole('cell', { name: '24', exact: true })).toBeVisible()
    await period.selectOption('firstQuarter')
    await expect(page.getByText(/Nema rezultata za izabrane filtere/)).toBeVisible()
    await button(page, 'Vrati početne filtere').tap()
    await expect(period).toHaveValue('firstHalf')
    await expect(category).toHaveValue('all')

    const cv = page.getByRole('link', { name: /Preuzmi CV/ })
    const downloaded = page.waitForEvent('download')
    await cv.tap()
    expect((await downloaded).suggestedFilename()).toBe('Srdjan_Pajic_CV.docx')
    await expect(page.getByRole('contentinfo').getByText('© Srdjan Pajic')).toBeVisible()
    await page.getByRole('link', { name: 'Nazad na vrh' }).tap()
    await expect(page).toHaveURL(/#top$/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
