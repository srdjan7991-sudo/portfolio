import { expect, test } from '@playwright/test'

const scene = page => page.locator('[data-request-cross-section]')
const graphic = section => section.locator('figure svg:visible')
const plane = section => graphic(section).locator('g[data-selected]').first()
const requestCable = section => graphic(section).locator('path[data-response="false"]').first()
const responseCable = section => graphic(section).locator('path[data-response="true"]').first()

async function scrollToStage(section, stage) {
  await section.evaluate((node, { edge, viewport, distance = 0 }) => {
    const bounds = node.getBoundingClientRect()
    scrollTo({ top: scrollY + bounds[edge] - innerHeight * viewport + distance, behavior: 'instant' })
  }, stage)
}

async function readPlane(section) {
  return plane(section).evaluate(node => {
    const transform = new DOMMatrix(getComputedStyle(node).transform)
    return [Math.round(transform.e), Math.round(transform.f)]
  })
}

const before = { edge: 'top', viewport: 1, distance: -20 }
const display = { edge: 'bottom', viewport: 0.85 }
const departing = { edge: 'bottom', viewport: 0.697 }
const after = { edge: 'bottom', viewport: 0, distance: 20 }

const assembled = [348, 54]
const separated = [630, 85]
const aligned = [630, 66]

async function expectStage(section, point, expectedPlane) {
  await scrollToStage(section, point)
  await expect.poll(() => readPlane(section)).toEqual(expectedPlane)
}

for (const [language, colorScheme] of [['en', 'light'], ['sr', 'dark']]) {
  test(`replays the ${language} request diagram through repeated scrolls in both directions`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('./')
    if (colorScheme === 'dark') await page.getByRole('switch', { name: 'Dark theme' }).click()
    if (language === 'sr') await page.getByRole('switch', { name: 'EN / SR, Serbian language' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme)

    const sequence = scene(page)
    await expect(sequence).toHaveAttribute('data-animated', 'true')
    await expect(sequence.locator(':scope > div').first()).toHaveCSS('position', 'sticky')
    await page.evaluate(() => document.fonts.ready)

    await expectStage(sequence, before, assembled)
    await expect(responseCable(sequence)).toHaveCSS('opacity', '0')
    await expectStage(sequence, display, aligned)
    await expect(responseCable(sequence)).toHaveCSS('opacity', '1')
    const art = await graphic(sequence).evaluate(svg => ({
      renderedWidth: svg.getScreenCTM().a * svg.viewBox.baseVal.width,
      readingWidth: svg.closest('figure').getBoundingClientRect().width,
    }))
    expect(art.renderedWidth).toBeGreaterThan(art.readingWidth)
    await expectStage(sequence, departing, separated)
    await expect(graphic(sequence)).toBeInViewport()
    await expectStage(sequence, after, assembled)

    await expectStage(sequence, departing, separated)
    await expectStage(sequence, display, aligned)
    await expectStage(sequence, before, assembled)

    await expectStage(sequence, display, aligned)
    await expectStage(sequence, after, assembled)
    await expectStage(sequence, display, aligned)
    await page.waitForTimeout(1200)
    expect(await readPlane(sequence)).toEqual(aligned)
    await expectStage(sequence, after, assembled)
    await expectStage(sequence, departing, separated)

    if (language === 'en') {
      const explore = page.getByRole('button', { name: 'Explore the request' })
      await explore.click()
      await expect(sequence.locator('figure')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
      await page.getByRole('button', { name: 'Close walkthrough' }).click()
      await expect(explore).toBeFocused()
      await expectStage(sequence, after, assembled)
      await expectStage(sequence, display, aligned)
    }
  })
}

test('scrubs the request diagram with the wheel in a short desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('./')
  await page.getByRole('switch', { name: 'Dark theme' }).click()
  await page.getByRole('switch', { name: 'EN / SR, Serbian language' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'sr')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.evaluate(() => document.fonts.ready)

  const sequence = scene(page)
  await expect(sequence.locator(':scope > div').first()).toHaveCSS('position', 'static')
  await expectStage(sequence, before, assembled)
  await page.mouse.move(15, 400)

  async function wheelToStage(point, pose) {
    const { delta, target } = await sequence.evaluate((node, { edge, viewport, distance = 0 }) => {
      const delta = Math.round(node.getBoundingClientRect()[edge] - innerHeight * viewport + distance)
      return { delta, target: scrollY + delta }
    }, point)
    await page.mouse.wheel(0, delta)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(target, 0)
    await expect.poll(() => readPlane(sequence)).toEqual(pose)
  }

  for (let pass = 0; pass < 2; pass++) {
    await wheelToStage(display, aligned)
    await expect(graphic(sequence)).toBeInViewport()
    await expect(requestCable(sequence)).toHaveCSS('opacity', '1')
    await expect(responseCable(sequence)).toHaveCSS('opacity', '1')

    await wheelToStage(departing, separated)
    await expect(graphic(sequence)).toBeInViewport()
    await wheelToStage(after, assembled)
    await expect(graphic(sequence)).not.toBeInViewport()

    await wheelToStage(departing, separated)
    await wheelToStage(display, aligned)
    await expect(responseCable(sequence)).toHaveCSS('opacity', '1')
    await wheelToStage(before, assembled)
  }
})

test('keeps the static alternatives when preferences or viewport change in place', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('./')
  const sequence = scene(page)
  await expect(sequence).toHaveAttribute('data-animated', 'true')
  await expectStage(sequence, after, assembled)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(sequence).not.toHaveAttribute('data-animated')
  await expectStage(sequence, before, aligned)
  await expectStage(sequence, after, aligned)

  await page.setViewportSize({ width: 1440, height: 800 })
  await expectStage(sequence, before, aligned)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(sequence).toHaveAttribute('data-animated', 'true')
  await expectStage(sequence, before, assembled)
  await expectStage(sequence, display, aligned)
  await expectStage(sequence, after, assembled)

  for (const [height, position] of [[815, 'static'], [816, 'sticky']]) {
    await page.setViewportSize({ width: 1440, height })
    await expect(sequence.locator(':scope > div').first()).toHaveCSS('position', position)
    await expectStage(sequence, display, aligned)
    await expect(graphic(sequence)).toBeInViewport()
    await expectStage(sequence, after, assembled)
    await expectStage(sequence, display, aligned)
  }

  await page.setViewportSize({ width: 1920, height: 512 })
  await expect(sequence).toHaveAttribute('data-animated', 'true')
  await expectStage(sequence, display, aligned)
  const { planeTop, headerBottom } = await plane(sequence).evaluate(layer => ({
    planeTop: layer.getBoundingClientRect().top,
    headerBottom: document.querySelector('header').getBoundingClientRect().bottom,
  }))
  expect(planeTop).toBeGreaterThanOrEqual(headerBottom)
  await expect(requestCable(sequence)).toHaveCSS('opacity', '1')
  await expect(responseCable(sequence)).toHaveCSS('opacity', '1')

  await page.setViewportSize({ width: 1920, height: 511 })
  await expect(sequence).not.toHaveAttribute('data-animated')
  await expectStage(sequence, before, aligned)
  await expectStage(sequence, after, aligned)

  await page.setViewportSize({ width: 1920, height: 2160 })
  await expect(sequence).toHaveAttribute('data-animated', 'true')
  await expectStage(sequence, display, aligned)
  await expect(responseCable(sequence)).toHaveCSS('opacity', '1')

  await page.setViewportSize({ width: 1920, height: 2161 })
  await expect(sequence).not.toHaveAttribute('data-animated')
  await expectStage(sequence, before, aligned)
  await expect(responseCable(sequence)).toHaveCSS('opacity', '1')

  await page.setViewportSize({ width: 1024, height: 2160 })
  await expect(sequence).not.toHaveAttribute('data-animated')
  await expectStage(sequence, before, aligned)
  await expect(responseCable(sequence)).toHaveCSS('opacity', '1')

  await page.setViewportSize({ width: 390, height: 844 })
  const compact = [18, 13]
  await expect(sequence).not.toHaveAttribute('data-animated')
  await expectStage(sequence, before, compact)
  await expectStage(sequence, after, compact)
  const database = sequence.getByRole('button', { name: 'Database' })
  await database.click()
  await expect(database).toHaveAttribute('aria-expanded', 'true')

  await page.setViewportSize({ width: 1440, height: 950 })
  await expect(sequence).toHaveAttribute('data-animated', 'true')
  await expectStage(sequence, after, assembled)
  await expectStage(sequence, display, aligned)
  await expect(database).toHaveAttribute('aria-expanded', 'true')
})
