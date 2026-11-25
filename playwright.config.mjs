import { defineConfig } from '@playwright/test'

const port = process.env.PORTFOLIO_BROWSER_PORT ?? '4187'
const baseURL = `http://127.0.0.1:${port}/portfolio/`

export default defineConfig({
  testDir: './browser-tests',
  testMatch: '**/*.pw.mjs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  globalSetup: './browser-tests/serve.mjs',
  use: { browserName: 'chromium', reducedMotion: 'reduce' },
  projects: [{ name: 'portfolio', use: { baseURL } }],
})
