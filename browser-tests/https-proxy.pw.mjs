import { expect, test } from '@playwright/test'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { request } from 'node:https'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'

const host = '127.0.0.1'
// The certificate and key in these fixtures are for this loopback test only.
const pfxPath = fileURLToPath(new URL('./fixtures/proxy-test.pfx', import.meta.url))
const ca = readFileSync(new URL('./fixtures/proxy-test.pem', import.meta.url))

function sendToProxy(port, headers) {
  return new Promise((resolve, reject) => {
    const body = 'proxy test'
    const outgoing = request({
      host, port, path: '/api/echo-client', method: 'POST', ca, agent: false,
      headers: { 'Content-Length': Buffer.byteLength(body), ...headers },
    }, async response => {
      try {
        let data = ''
        for await (const chunk of response.setEncoding('utf8')) data += chunk
        resolve({ status: response.statusCode, ...JSON.parse(data) })
      } catch (error) {
        reject(error)
      }
    })
    outgoing.on('error', reject)
    outgoing.setTimeout(5_000, () => outgoing.destroy(new Error('HTTPS proxy request timed out')))
    if (headers.Expect) {
      outgoing.once('continue', () => outgoing.end(body))
      outgoing.flushHeaders()
    } else outgoing.end(body)
  })
}

test('HTTPS development proxy forwards the socket address for regular and continue requests', async () => {
  const upstream = createServer(async (incoming, response) => {
    let body = ''
    for await (const chunk of incoming.setEncoding('utf8')) body += chunk
    response.end(JSON.stringify({ address: incoming.headers['x-forwarded-for'], body }))
  })
  upstream.listen(0, host)
  await once(upstream, 'listening')

  const priorEnvironment = {
    PORTFOLIO_TLS_PFX: process.env.PORTFOLIO_TLS_PFX,
    PORTFOLIO_TLS_PASSWORD: process.env.PORTFOLIO_TLS_PASSWORD,
  }
  process.env.PORTFOLIO_TLS_PFX = pfxPath
  delete process.env.PORTFOLIO_TLS_PASSWORD
  let vite
  try {
    vite = await createViteServer({
      optimizeDeps: { noDiscovery: true, include: [] },
      server: {
        host, ws: false, watch: null,
        proxy: { '/api': { target: `http://${host}:${upstream.address().port}` } },
      },
    })
    await vite.listen(0)
    const { port } = vite.httpServer.address()
    const expected = { status: 200, address: host, body: 'proxy test' }
    expect(await sendToProxy(port, { 'X-Forwarded-For': '192.0.2.10' })).toEqual(expected)
    expect(await sendToProxy(port, { Expect: '100-continue' })).toEqual(expected)
  } finally {
    for (const [name, value] of Object.entries(priorEnvironment)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    try {
      await vite?.close()
    } finally {
      await new Promise((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()))
    }
  }
})
