import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'

export default defineConfig(({ command, isPreview, mode }) => {
  const windowsDemo = mode === 'windows-demo'
  const certificatePath = process.env.PORTFOLIO_TLS_PFX
  const https = command === 'serve' && !windowsDemo && !isPreview && certificatePath
    ? { pfx: readFileSync(certificatePath), passphrase: process.env.PORTFOLIO_TLS_PASSWORD }
    : undefined

  return {
    base: windowsDemo ? './' : command === 'build' || isPreview ? '/portfolio/' : '/',
    plugins: [react()],
    server: https ? {
      https,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5082',
          bypass(incoming) {
            // Normalize before Vite copies headers into the upstream request.
            delete incoming.headers['x-forwarded-for']
            const clientAddress = incoming.socket.remoteAddress
            if (clientAddress) incoming.headers['x-forwarded-for'] = clientAddress
          },
        },
      },
    } : undefined,
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/setupTests.ts'],
        reporter: ['text', 'html'],
      },
    },
  }
})
