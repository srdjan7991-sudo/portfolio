import { expect, test } from '@playwright/test'

const scene = page => page.locator('[data-request-cross-section]')
const graphic = section => section.locator('figure svg:visible')
const plane = section => graphic(section).locator('g[data-selected]').first()
const cable = section => graphic(section).locator('path[data-response="false"], path[data-response="true"]').first()

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
    await page.evaluate(() => document.fonts.ready)

    await expectStage(sequence, before, assembled)
    await expect(cable(sequence)).toHaveCSS('opacity', '0')
    await expectStage(sequence, display, aligned)
    await expect(cable(sequence)).toHaveCSS('opacity', '1')
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
      await page.getByRole('button', { name: 'Open walkthrough' }).click()
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
      await page.getByRole('button', { name: 'Close walkthrough' }).click()
      await expect(explore).toBeFocused()
      await expectStage(sequence, after, assembled)
      await expectStage(sequence, display, aligned)
    }
  })
}

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

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 1440, height: 800 })
  await expect(sequence).not.toHaveAttribute('data-animated')
  await expectStage(sequence, before, aligned)
  await expectStage(sequence, after, aligned)

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
