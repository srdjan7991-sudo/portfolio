import { build, preview } from 'vite'

export default async function serve(config) {
  const { hostname, port } = new URL(config.projects[0].use.baseURL)
  const buildOptions = { outDir: '.browser-dist' }
  await build({
    build: buildOptions,
    define: { 'import.meta.env.VITE_PORTFOLIO_AUTH_ENABLED': '"true"' },
  })
  const server = await preview({
    build: buildOptions,
    preview: { host: hostname, port: Number(port), strictPort: true },
  })
  return () => server.close()
}
