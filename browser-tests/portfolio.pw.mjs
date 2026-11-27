import { expect, test } from '@playwright/test'

const action = (page, name) => page.getByRole('button', { name, exact: true })
const reportPoint = (page, category) => page.getByRole('button', { name: new RegExp(`${category}, May 2026`) })
const openTooltip = page => page.locator('[data-open="true"][data-positioned="true"]')

async function openReport(page) {
  await page.getByText('Try a sample report', { exact: true }).click()
  await expect(page.getByRole('table', { name: 'Monthly data' })).toBeVisible()
}

async function openLivePortfolio(page, respond) {
  // Keep the browser on HTTPS to exercise the application's live-mode entry point.
  // Assets come from the local preview. Only API results use fixtures.
  const origin = 'https://portfolio.test'
  await page.route(`${origin}/**`, async route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/api/')) {
      return route.fulfill(respond(url.pathname, route.request()) ?? { status: 401 })
    }
    const response = await route.fetch({
      url: new URL(url.pathname + url.search, process.env.PORTFOLIO_TEST_AUTH_PREVIEW_URL).href,
      maxRedirects: 0,
    })
    return route.fulfill({ response })
  })
  await page.goto(`${origin}/portfolio/`)
}

test('keyboard focus holds a live response until playback resumes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await openLivePortfolio(page, path => path === '/api/sections' ? {
    json: [{ key: 'expertise', title: 'How I Engineer', body: 'Published section' }],
  } : undefined)
  await action(page, 'Explore the request').click()
  await expect(page.getByText('Live request', { exact: true })).toBeVisible()
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

test('keeps administrator controls on the main alignment and saves a keyboard reorder', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const original = ['work', 'skills', 'expertise', 'experience', 'education', 'contact']
  let order = original
  const submissions = []
  await openLivePortfolio(page, (path, request) => {
    if (path === '/api/auth/refresh') {
      return { json: { accessToken: 'test-session', expiresAt: new Date(Date.now() + 600_000).toISOString() } }
    }
    if (path === '/api/auth/me') return { json: { id: 'test-admin', email: null, role: 'Admin' } }
    if (path === '/api/sections/order' && request.method() === 'PUT') {
      const requestBody = request.postDataJSON()
      submissions.push(requestBody)
      order = requestBody.keys
      return { json: { keys: order } }
    }
    if (path === '/api/sections/order') return { json: { keys: order } }
  })
  const editing = action(page, 'Editing mode')
  await editing.click()
  await openReport(page)
  const report = page.getByText('Try a sample report', { exact: true }).locator('xpath=following-sibling::div')
  const checkReport = async () => {
    await expect(report).toBeVisible()
    const work = await page.locator('#work').boundingBox()
    const panel = await report.boundingBox()
    expect(panel.width).toBeGreaterThan(work.width)
    expect(panel.x + panel.width / 2).toBeCloseTo(work.x + work.width / 2, 0)
  }
  const handle = action(page, 'Reorder Selected Work')
  const orderOnPage = () => page.locator('.portfolio-order-item > section').evaluateAll(sections => sections.map(section => section.id))
  await expect.poll(orderOnPage).toEqual(original)
  await handle.press('Enter')
  await handle.press('ArrowDown')
  const updated = ['skills', 'work', 'expertise', 'experience', 'education', 'contact']
  await expect.poll(orderOnPage).toEqual(updated)
  await handle.press('Escape')
  await expect.poll(orderOnPage).toEqual(original)
  await checkReport()
  expect(submissions).toEqual([])
  await handle.press('Enter')
  await handle.press('ArrowDown')
  await handle.press('Enter')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  await expect.poll(orderOnPage).toEqual(updated)
  await checkReport()
  expect(submissions).toEqual([{ keys: updated, expectedKeys: original }])

  for (const language of ['en', 'sr']) {
    if (language === 'sr') await page.getByRole('switch', { name: 'EN / SR, Serbian language' }).click()
    for (const width of [1440, 1280, 1024, 768, 640, 620, 609, 608, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      const layout = await page.locator('.portfolio-admin-toolbar-inner').evaluate(toolbar => {
        const left = element => element.getBoundingClientRect().left
        const right = element => element.getBoundingClientRect().right
        return {
          toolbarLeft: left(toolbar), workLeft: left(document.querySelector('#work')),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          controlsFit: [...toolbar.querySelectorAll('button')].every(button =>
            left(button) >= left(toolbar) - 1 && right(button) <= right(toolbar) + 1),
        }
      })
      expect(layout, `${language} / ${width} px`).toEqual({
        toolbarLeft: layout.workLeft, workLeft: layout.workLeft, overflow: 0, controlsFit: true,
      })
    }
  }

  await page.setViewportSize({ width: 1920, height: 512 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const scene = page.locator('[data-request-cross-section]')
  await expect(scene).toHaveAttribute('data-animated', 'true')
  await scene.evaluate(section => window.scrollTo({
    top: window.scrollY + section.getBoundingClientRect().bottom - 0.85 * window.innerHeight,
    behavior: 'instant',
  }))
  const graphic = scene.locator('figure svg:visible')
  await expect(graphic.locator('path[data-response="true"]').first()).toHaveCSS('opacity', '1')
  const clearance = await graphic.evaluate(svg => {
    const header = document.querySelector('header').getBoundingClientRect().bottom
    return Math.min(...Array.from(svg.querySelectorAll('g[data-selected]'), layer => layer.getBoundingClientRect().top)) - header
  })
  expect(clearance).toBeGreaterThanOrEqual(0)
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

for (const plotTop of [96, -95]) {
  test(`hover tooltip leaves both bars clickable at plot top ${plotTop}px`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 420 })
    await page.goto('./')
    await openReport(page)
    const quality = reportPoint(page, 'Quality')
    const utilization = reportPoint(page, 'Utilization')
    await quality.evaluate((el, top) => {
      window.scrollBy({ top: el.closest('[data-chart-plot]').getBoundingClientRect().top - top, behavior: 'instant' })
    }, plotTop)

    const table = page.getByRole('table', { name: 'Monthly data' })
    const selectedValue = table.locator('td[aria-current="true"]')
    for (const [point, value] of [[quality, '115'], [utilization, '77']]) {
      const bar = await point.locator('[data-zero]').boundingBox()
      const x = bar.x + bar.width / 2
      const y = bar.y + bar.height - 10
      await page.mouse.move(x, y)
      await expect(openTooltip(page)).toContainText(value)
      await page.mouse.click(x, y)
      await expect(point).toHaveAttribute('aria-pressed', 'true')
      await expect(selectedValue).toHaveText(value)
    }
    await expect(quality).toHaveAttribute('aria-pressed', 'false')
  })
}

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

    await page.clock.install()
    await page.mouse.move(sourceX, panel.y + panel.height / 2, { steps: 6 })
    await page.mouse.move(panel.x + panel.width - 12, panel.y + panel.height - 12, { steps: 6 })
    await page.clock.fastForward(200)
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
    const reading = page.getByRole('figure', { name: 'Completed reports by month' }).locator('[data-open="true"]')
    await quality.tap()
    await expect(reading).toBeInViewport()
    await expect(reading).toContainText('115')
    await expect(quality).toHaveAttribute('aria-pressed', 'true')
    await utilization.tap()
    await expect(reading).toBeInViewport()
    await expect(reading).toContainText('77')
    await expect(quality).toHaveAttribute('aria-pressed', 'false')
    await expect(utilization).toHaveAttribute('aria-pressed', 'true')
  })
})
