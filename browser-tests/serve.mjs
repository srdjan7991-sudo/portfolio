import { build, preview } from 'vite'

export default async function serve(config) {
  const [project] = config.projects
  const { hostname, port } = new URL(project.use.baseURL)
  const buildOptions = { outDir: `.browser-dist/${project.name}` }
  await build({
    mode: 'production',
    build: buildOptions,
    define: { 'import.meta.env.VITE_PORTFOLIO_AUTH_ENABLED': '"true"' },
  })
  const server = await preview({
    mode: 'production',
    build: buildOptions,
    preview: { host: hostname, port: Number(port), strictPort: true },
  })
  return () => server.close()
}
