import { build, preview } from 'vite'

export default async function serve(config) {
  const servers = []
  const closeServers = () => Promise.all(servers.map(server => server.close()))
  try {
    for (const project of config.projects) {
      const demo = project.name === 'windows-demo'
      if (demo && process.env.PORTFOLIO_WINDOWS_DEMO_BROWSER_URL) continue
      const { hostname, port } = new URL(project.use.baseURL)
      const mode = demo ? 'windows-demo' : 'production'
      const buildOptions = { outDir: `.browser-dist/${project.name}` }
      await build({
        mode,
        build: buildOptions,
        define: { 'import.meta.env.VITE_PORTFOLIO_AUTH_ENABLED': '"true"' },
      })
      servers.push(await preview({
        mode,
        build: buildOptions,
        preview: { host: hostname, port: Number(port), strictPort: true },
      }))
    }
  } catch (error) {
    await closeServers()
    throw error
  }
  return closeServers
}
