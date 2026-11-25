import { readFileSync } from 'node:fs'
import { build, preview } from 'vite'

async function startPreview(host, port, outDir, { define, https } = {}) {
  const buildOptions = { outDir }
  await build({ mode: 'production', build: buildOptions, define })
  return preview({
    mode: 'production',
    build: buildOptions,
    preview: { host, port, strictPort: true, https },
  })
}

export default async function serve(config) {
  const [project] = config.projects
  const { hostname, port } = new URL(project.use.baseURL)
  const pfx = readFileSync(new URL('./fixtures/proxy-test.pfx', import.meta.url))
  const publicPreview = await startPreview(hostname, Number(port), `.browser-dist/${project.name}`, { https: { pfx } })
  try {
    const authPreview = await startPreview(hostname, 0, '.browser-dist/live', {
      define: { 'import.meta.env.VITE_PORTFOLIO_AUTH_ENABLED': '"true"' },
    })
    process.env.PORTFOLIO_TEST_AUTH_PREVIEW_URL = `http://${hostname}:${authPreview.httpServer.address().port}/portfolio/`
    return () => Promise.all([publicPreview.close(), authPreview.close()])
  } catch (error) {
    await publicPreview.close()
    throw error
  }
}
