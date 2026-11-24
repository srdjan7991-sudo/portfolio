import { expect, test as base } from '@playwright/test'

const orderStorageKey = 'portfolio-windows-section-order'
const defaultOrder = ['work', 'skills', 'expertise', 'experience', 'education', 'contact']
const skillsFirst = ['skills', 'work', 'expertise', 'experience', 'education', 'contact']
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
    expect(apiRequests, 'The demo does not contact a backend').toEqual([])
    expect(errors, 'The demo loads and operates without browser errors').toEqual([])
  },
})

async function expectOrder(page, order) {
  const sections = page.locator('main section:is(#work, #skills, #expertise, #experience, #education, #contact)')
  await expect.poll(() => sections.evaluateAll(items => items.map(item => item.id))).toEqual(order)
  await expect(page.locator('main > section').first()).toHaveAttribute('id', 'top')
  await expect(page.locator('main + footer')).toBeVisible()
}

async function expectNavigation(page, order) {
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await expect.poll(() => navigation.getByRole('link').evaluateAll(links => links.map(link => link.hash)))
    .toEqual(order.map(key => '#' + key))
}

const toolbarLabels = {
  en: {
    toolbar: 'Local layout controls', edit: 'Edit layout', moveDown: 'Move Selected Work down',
    reset: 'Reset layout', cancel: 'Cancel', save: 'Save changes', saved: 'Layout saved in this browser.',
  },
  sr: {
    toolbar: 'Kontrole lokalnog rasporeda', edit: 'Uredi raspored', moveDown: 'Pomeri sekciju „Izdvojeni projekti” dole',
    reset: 'Vrati raspored', cancel: 'Otkaži', save: 'Sačuvaj izmene', saved: 'Raspored je sačuvan u ovom pregledaču.',
  },
}

for (const [language, labels] of Object.entries(toolbarLabels)) {
  for (const width of [390, 608, 609, 620, 640, 768, 1440]) {
    test(`keeps the ${language} layout toolbar buttons in view at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 })
      await page.goto('./')
      if (language === 'sr') await page.getByRole('switch', { name: 'EN / SR, Serbian language' }).click()
      await expect(page.locator('html')).toHaveAttribute('lang', language)

      const toolbar = page.getByRole('complementary', { name: labels.toolbar })
      await button(toolbar, labels.edit).click()
      await button(page, labels.moveDown).click()
      await expectOrder(page, skillsFirst)

      const save = button(toolbar, labels.save)
      await expect(save).toBeEnabled()
      for (const label of [labels.edit, labels.reset, labels.cancel, labels.save]) {
        await expect(button(toolbar, label)).toBeInViewport({ ratio: 1 })
      }

      await button(toolbar, labels.cancel).focus()
      await page.keyboard.press('Tab')
      await expect(save).toBeFocused()
      await save.click()
      await expect(toolbar.getByText(labels.saved, { exact: true })).toBeVisible()
    })
  }
}

test('saves a layout locally, discards a draft and resets to the original order', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Software Engineer')
  await expect(button(page, 'Sign in')).toHaveCount(0)
  await expectOrder(page, defaultOrder)

  await button(page, 'Edit layout').click()
  await button(page, 'Move Selected Work down').click()
  await expectOrder(page, skillsFirst)
  await expectNavigation(page, skillsFirst)
  await button(page, 'Cancel').click()
  await expectOrder(page, defaultOrder)

  await button(page, 'Edit layout').click()
  const handle = button(page, 'Reorder Selected Work')
  await handle.focus()
  await page.keyboard.press('Space')
  await expect(handle).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowDown')
  await expectOrder(page, skillsFirst)
  await expect(handle).toBeFocused()
  await page.keyboard.press('Space')
  await expect(handle).toHaveAttribute('aria-pressed', 'false')
  await button(page, 'Save changes').click()
  await expect(page.getByText('Layout saved in this browser.', { exact: true })).toBeVisible()

  await page.reload()
  await expectOrder(page, skillsFirst)
  await expectNavigation(page, skillsFirst)
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  const skillsLink = nav.getByRole('link', { name: 'Skills', exact: true })
  await skillsLink.click()
  await expect(page).toHaveURL(/#skills$/)
  await expect(page.getByRole('region', { name: 'Technical Skills' })).toBeFocused()
  await expect(skillsLink).toHaveAttribute('aria-current', 'location')

  const reopened = await context.newPage()
  try {
    await reopened.goto('./')
    await expectOrder(reopened, skillsFirst)
  } finally {
    await reopened.close()
  }

  await button(page, 'Edit layout').click()
  await button(page, 'Reset layout').click()
  await expectOrder(page, defaultOrder)
  await button(page, 'Cancel').click()
  await expectOrder(page, skillsFirst)
  await button(page, 'Edit layout').click()
  await button(page, 'Reset layout').click()
  await button(page, 'Save changes').click()
  await page.reload()
  await expectOrder(page, defaultOrder)
  await expectNavigation(page, defaultOrder)
})

test('rejects an invalid stored order and reports a failed local save', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify({ keys: ['top', 'skills', 'work', 'work', 'experience', 'contact'] }))
    const originalSet = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('The test browser denied this write.', 'QuotaExceededError')
      originalSet.call(this, name, value)
    }
  }, { key: orderStorageKey })
  await page.goto('./')
  await expectOrder(page, defaultOrder)
  await button(page, 'Edit layout').click()
  await button(page, 'Move Selected Work down').click()
  await button(page, 'Save changes').click()
  await expect(page.getByText('Could not save the layout in this browser.', { exact: true })).toBeVisible()
  await expect(page.getByText('Layout saved in this browser.', { exact: true })).toHaveCount(0)
  await page.reload()
  await expectOrder(page, defaultOrder)
})

test('keeps an existing mouse drag inside the unsaved layout draft', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.goto('./#contact')
  await button(page, 'Edit layout').click()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Contact' }).click()
  const handle = button(page, 'Reorder Contact')
  const previous = page.locator('#education')
  await expect(handle).toBeVisible()
  const handleBox = await handle.boundingBox()
  const previousBox = await previous.boundingBox()
  const x = handleBox.x + handleBox.width / 2
  const y = handleBox.y + handleBox.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y - previousBox.height / 2 - 44, { steps: 16 })
  await page.mouse.up()

  await expectOrder(page, ['work', 'skills', 'expertise', 'experience', 'contact', 'education'])
  await expect(button(page, 'Save changes')).toBeEnabled()
  await button(page, 'Cancel').click()
  await expectOrder(page, defaultOrder)
})

test('keeps the Hero and all six request stages interactive without a live response', async ({ page }) => {
  await page.goto('./')
  await button(page, 'Pin first task').click()
  await expect(page.getByRole('list', { name: 'Review queue' })).toContainText('Pinned')
  await button(page, 'Refresh queue').click()
  await expect(page.getByText('Revision 2', { exact: true })).toBeVisible()

  await button(page, 'Explore the request').click()
  await button(page, 'Open walkthrough').click()
  await expect(page.getByText('This visual walkthrough uses example content. It does not send a request to a backend.', { exact: true })).toBeVisible()
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

test.describe('mobile demo', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('supports mobile themes, Serbian, the analytics demo and the packaged CV', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('./')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Software Engineer')
    const theme = page.getByRole('switch', { name: 'Dark theme' })
    await expect(theme).toHaveAttribute('aria-checked', 'false')
    await theme.tap()
    await expect(theme).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await button(page, 'Edit layout').tap()
    await button(page, 'Move Selected Work down').tap()
    await expectOrder(page, skillsFirst)
    await button(page, 'Cancel').tap()
    await expectOrder(page, defaultOrder)
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
