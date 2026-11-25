import { expect, test } from '@playwright/test'

test('updates the active navigation when Experience details change the layout at a fixed scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('./')
  await page.evaluate(async () => { await document.fonts.ready })

  const details = page.getByRole('button', { name: 'Details for Kterio' })
  const education = page.getByRole('region', { name: 'Education & Certifications' })
  const current = page.getByRole('navigation', { name: 'Main navigation' }).locator('[aria-current="location"]')

  await details.focus()
  await page.keyboard.press('Enter')
  await expect(details).toHaveAttribute('aria-expanded', 'true')

  const { readingLine, scrollPosition } = await education.evaluate(section => {
    const headerHeight = document.querySelector('header').getBoundingClientRect().height
    const readingLine = Math.max(headerHeight + 24, document.documentElement.clientHeight * 0.3)
    window.scrollBy({ top: section.getBoundingClientRect().top - readingLine - 20, behavior: 'instant' })
    return { readingLine, scrollPosition: window.scrollY }
  })

  for (let pass = 0; pass < 3; pass++) {
    expect((await education.boundingBox()).y).toBeGreaterThan(readingLine)
    await expect(current).toHaveAttribute('href', '#experience')

    await page.keyboard.press('Enter')
    await expect(details).toHaveAttribute('aria-expanded', 'false')
    expect((await education.boundingBox()).y).toBeLessThan(readingLine)
    await expect(current).toHaveAttribute('href', '#education')
    await expect(details).toBeFocused()
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollPosition)

    if (pass < 2) {
      await page.keyboard.press('Enter')
      await expect(details).toHaveAttribute('aria-expanded', 'true')
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollPosition)
    }
  }

  // Scrolling in either direction still updates the same navigation links.
  await page.evaluate(() => window.scrollBy({ top: -100, behavior: 'instant' }))
  await expect(current).toHaveAttribute('href', '#experience')
  await page.evaluate(() => window.scrollBy({ top: 100, behavior: 'instant' }))
  await expect(current).toHaveAttribute('href', '#education')
})
