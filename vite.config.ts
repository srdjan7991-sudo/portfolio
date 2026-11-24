import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'

export default defineConfig(({ command, isPreview }) => {
  const certificatePath = process.env.PORTFOLIO_TLS_PFX
  const https = command === 'serve' && !isPreview && certificatePath
    ? { pfx: readFileSync(certificatePath), passphrase: process.env.PORTFOLIO_TLS_PASSWORD }
    : undefined

  return {
    base: command === 'build' || isPreview ? '/portfolio/' : '/',
    plugins: [react()],
    server: https ? {
      https,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5082',
          configure(proxy) {
            proxy.on('proxyReq', (outgoing, incoming) => {
              outgoing.removeHeader('x-forwarded-for')
              const clientAddress = incoming.socket.remoteAddress
              if (clientAddress) outgoing.setHeader('x-forwarded-for', clientAddress)
            })
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
