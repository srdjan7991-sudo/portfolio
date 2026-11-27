import { expect, test } from '@playwright/test'

test.use({
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  reducedMotion: 'no-preference',
})

const track = page => page.locator('[data-living-architecture]')
const stage = page => track(page).locator('[data-architecture-stage]')
const canvas = page => stage(page).locator('canvas')

async function seek(page, progress) {
  await track(page).evaluate((element, point) => {
    const stage = element.querySelector('[data-architecture-stage]')
    const pinTop = parseFloat(getComputedStyle(stage).top)
    scrollTo({
      top: scrollY + element.getBoundingClientRect().top - pinTop + (element.offsetHeight - stage.offsetHeight) * point,
      behavior: 'instant',
    })
  }, progress)
  await expect.poll(async () => track(page).evaluate((node, point) =>
    Math.abs(Number(node.style.getPropertyValue('--scene-progress')) - point), progress)).toBeLessThan(0.015)
}

async function openScene(page) {
  await page.goto('./')
  await track(page).scrollIntoViewIfNeeded()
  await expect(track(page)).toHaveAttribute('data-renderer', 'webgl')
  await expect(canvas(page)).toBeVisible()
}

test('renders five different, reversible frames while the stage stays in view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 930 })
  await openScene(page)
  const images = []
  const positions = [0.07, 0.34, 0.58, 0.76, 0.99]
  for (const [phase, position] of positions.entries()) {
    await seek(page, position)
    await expect(track(page)).toHaveAttribute('data-phase', String(phase))
    const block = await stage(page).boundingBox()
    expect(block.y).toBeGreaterThanOrEqual(70)
    expect(block.y + block.height).toBeLessThan(930)
    images.push(await canvas(page).screenshot())
  }
  expect(new Set(images.map(image => image.toString('base64'))).size).toBe(5)
  await seek(page, 0.34)
  expect((await canvas(page).screenshot()).equals(images[1])).toBe(true)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await expect(track(page)).toHaveAttribute('data-phase', '0')
  await seek(page, 0.99)
  await expect(track(page)).toHaveAttribute('data-phase', '4')
})

test('the pointer changes the artwork while keeping the scroll phase and settles after leaving', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 930 })
  await openScene(page)
  await seek(page, 0.07)
  const neutral = await canvas(page).screenshot()
  const art = await canvas(page).boundingBox()
  await page.mouse.move(art.x + art.width * 0.88, art.y + art.height * 0.28)
  await expect.poll(async () => (await canvas(page).screenshot()).equals(neutral)).toBe(false)
  await expect(track(page)).toHaveAttribute('data-phase', '0')
  await page.mouse.move(90, 36)
  await expect.poll(async () => (await canvas(page).screenshot()).equals(neutral)).toBe(true)
})

test('reframes across the target widths, themes and languages without clipping its controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openScene(page)
  const opening = await page.locator('h1').innerText()
  await page.getByRole('switch', { name: 'Dark theme' }).click()
  await page.getByRole('switch', { name: 'EN / SR, Serbian language' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'sr')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('h1')).not.toHaveText(opening)
  await expect(track(page).getByRole('heading')).toHaveText('Živa arhitektura')
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await seek(page, 0.58)
    await expect(track(page)).toHaveAttribute('data-phase', '2')
    await expect(track(page).getByText('Povezivanje', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    const link = await track(page).getByRole('link').boundingBox()
    const box = await stage(page).boundingBox()
    expect(link.x).toBeGreaterThan(box.x)
    expect(link.x + link.width).toBeLessThan(box.x + box.width)
    expect(link.y + link.height).toBeLessThan(box.y + box.height)
  }
})

test('reduced motion and unavailable WebGL both display the still artwork without a pinned run', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const loaded = []
  page.on('request', request => { if (request.url().includes('/playArchitecture-')) loaded.push(request.url()) })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await track(page).scrollIntoViewIfNeeded()
  await expect(canvas(page)).toBeHidden()
  await expect(stage(page).locator('svg')).toBeVisible()
  await expect(stage(page)).toHaveCSS('position', 'relative')
  expect(loaded).toEqual([])

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(track(page)).toHaveAttribute('data-renderer', 'webgl')
  await seek(page, 0.76)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(track(page)).toHaveAttribute('data-renderer', 'static')
  await expect(stage(page)).toHaveCSS('position', 'relative')
  await expect(stage(page)).toBeInViewport({ ratio: 0.7 })

  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl2' ? null : getContext.call(this, type, ...args)
    }
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('./?no-webgl')
  await track(page).scrollIntoViewIfNeeded()
  await expect(track(page)).toHaveAttribute('data-renderer', 'fallback')
  await expect(canvas(page)).toBeHidden()
  await expect(stage(page)).toHaveCSS('position', 'relative')
  await expect(page.getByRole('link', { name: 'View selected work' })).toBeVisible()
})

test('keeps direct links stable and restores the still artwork if the GPU context is lost', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 930 })
  await page.goto('./#living-application')
  const heading = page.locator('#living-application')
  await expect(heading).toBeFocused()
  await expect(heading).toBeInViewport()
  await expect(track(page)).toHaveAttribute('data-renderer', 'static')
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await expect(track(page)).toHaveAttribute('data-renderer', 'webgl')
  await seek(page, 0.58)
  const extension = await canvas(page).evaluate(node => {
    const context = node.getContext('webgl2')
    const lose = context?.getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return Boolean(lose)
  })
  expect(extension).toBe(true)
  await expect(track(page)).toHaveAttribute('data-renderer', 'fallback')
  await expect(stage(page).locator('svg')).toBeVisible()
  await expect(stage(page)).toBeInViewport({ ratio: 0.7 })
  await track(page).getByRole('link', { name: 'Explore the interface' }).press('Enter')
  await expect(heading).toBeFocused()
  await expect(heading).toBeInViewport()
  await page.getByRole('button', { name: 'Refresh queue' }).click()
  await expect(page.getByText('Revision 2', { exact: true })).toBeVisible()
})

test.describe('touch layout', () => {
  test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 2 })

  test('keeps the full scene and its interface link usable at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openScene(page)
    await seek(page, 0.99)
    await expect(track(page)).toHaveAttribute('data-phase', '4')
    const ratio = await canvas(page).evaluate(node => node.width / node.clientWidth)
    expect(ratio).toBeLessThanOrEqual(1.25)
    await track(page).getByRole('link', { name: 'Explore the interface' }).tap()
    const heading = page.locator('#living-application')
    await expect(heading).toBeInViewport()
    await expect(page).toHaveURL(/#living-application$/)
  })
})
