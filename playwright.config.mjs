import { defineConfig } from '@playwright/test'

const port = process.env.PORTFOLIO_BROWSER_PORT ?? '4187'
const baseURL = `http://127.0.0.1:${port}/portfolio/`
const demoPort = process.env.PORTFOLIO_WINDOWS_DEMO_BROWSER_PORT ?? '4188'
const demoURL = process.env.PORTFOLIO_WINDOWS_DEMO_BROWSER_URL ?? `http://127.0.0.1:${demoPort}/`

export default defineConfig({
  testDir: './browser-tests',
  testMatch: '**/*.pw.mjs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  globalSetup: './browser-tests/serve.mjs',
  use: { browserName: 'chromium', reducedMotion: 'reduce' },
  projects: [
    { name: 'portfolio', testIgnore: '**/windows-demo.pw.mjs', use: { baseURL } },
    { name: 'windows-demo', testMatch: '**/windows-demo.pw.mjs', use: { baseURL: demoURL } },
  ],
})
