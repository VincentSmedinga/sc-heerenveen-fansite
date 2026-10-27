import type { Server } from 'node:http'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMcpServer } from './server.ts'
import { initializeParams, listen, rpc } from './test-client.ts'

// A small copy of the manifests that Storybook builds: the same shape, with two components and
// one page, because the manifests of the whole build are 200 kB. scripts/smoke.js runs the same
// checks against the manifests of a real build.
const fixtureDir = path.resolve(import.meta.dirname, 'fixtures')

describe('the MCP server of the design system', () => {
  const servers: Server[] = []
  const logged: string[] = []

  async function start(options: { maxBodyBytes?: number; storybookDir?: string } = {}) {
    const server = createMcpServer({ log: (line) => logged.push(line), storybookDir: fixtureDir, ...options })
    servers.push(server)

    return listen(server)
  }

  beforeEach(() => {
    logged.length = 0
  })

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))))
  })

  it('answers initialize, and lists exactly the three tools for the documentation', async () => {
    const url = await start()
    const { message } = await rpc(url, 'initialize', initializeParams)
    const { message: tools } = await rpc(url, 'tools/list', {}, 2)

    expect(message.result.serverInfo.name).toBe('@storybook/mcp')
    expect(tools.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
      'docs-list',
      'docs-show',
      'docs-show-story',
    ])
  })

  it('names the components with docs-list', async () => {
    const url = await start()
    const { message } = await rpc(url, 'tools/call', { arguments: {}, name: 'docs-list' })
    const text: string = message.result.content[0].text

    expect(message.result.isError).not.toBe(true)
    expect(text).toContain('componenten-tekst-heading')
    expect(text).toContain('componenten-formulier-button')
    expect(text).toContain('huisstijl--documentatie')
  })

  it('gives the props of Heading with their types with docs-show', async () => {
    const url = await start()
    const { message } = await rpc(url, 'tools/call', {
      arguments: { id: 'componenten-tekst-heading' },
      name: 'docs-show',
    })
    const text: string = message.result.content[0].text

    expect(message.result.isError).not.toBe(true)
    expect(text).toContain('level')
    expect(text).toContain('1 | 4 | 2 | 3')
    expect(text).toContain('appearance')
  })

  it('gives a story with docs-show-story', async () => {
    const url = await start()
    const { message } = await rpc(url, 'tools/call', {
      arguments: { componentId: 'componenten-tekst-heading', storyName: 'Kop' },
      name: 'docs-show-story',
    })

    expect(message.result.isError).not.toBe(true)
    expect(message.result.content[0].text).toContain('Wedstrijden')
  })

  it('answers every request on its own, so another process can answer the next one', async () => {
    const [first, second] = [await start(), await start()]
    const { response } = await rpc(first, 'initialize', initializeParams)

    // The client has no session to send: the server gives none. A client that sends one anyway
    // is answered all the same.
    expect(response.headers.get('mcp-session-id')).toBeNull()

    const sessionId = 'a-session-another-process-started'
    const answer = await fetch(second, {
      body: JSON.stringify({
        id: 2,
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { arguments: {}, name: 'docs-list' },
      }),
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        'mcp-session-id': sessionId,
      },
      method: 'POST',
    })

    expect(answer.status).toBe(200)
    expect(await answer.text()).toContain('componenten-tekst-heading')
    expect(answer.headers.get('mcp-session-id')).toBeNull()
  })

  it('shows the new manifests after a deploy', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ds-mcp-'))

    try {
      await cp(path.join(fixtureDir, 'manifests'), path.join(dir, 'manifests'), { recursive: true })
      const url = await start({ storybookDir: dir })
      const before = await rpc(url, 'tools/call', { arguments: {}, name: 'docs-list' })

      expect(before.message.result.content[0].text).not.toContain('componenten-nieuw')

      const components = JSON.parse(await readFile(path.join(dir, 'manifests/components.json'), 'utf8'))
      components.components['componenten-nieuw'] = {
        ...components.components['componenten-formulier-button'],
        id: 'componenten-nieuw',
        name: 'Nieuw',
      }
      await writeFile(path.join(dir, 'manifests/components.json'), JSON.stringify(components))

      const after = await rpc(url, 'tools/call', { arguments: {}, name: 'docs-list' })

      expect(after.message.result.content[0].text).toContain('componenten-nieuw')
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })

  it('reports an error from the tool, not a crash, when the manifests are missing', async () => {
    const url = await start({ storybookDir: path.join(tmpdir(), 'ds-mcp-does-not-exist') })
    const { message, response } = await rpc(url, 'tools/call', { arguments: {}, name: 'docs-list' })

    expect(response.status).toBe(200)
    expect(message.result.isError).toBe(true)
    // The error names the manifest, not the folder on the host.
    expect(JSON.stringify(message)).not.toContain(tmpdir())
  })

  it('makes no request of its own', async () => {
    const url = await start()
    const requested: string[] = []
    const realFetch = globalThis.fetch

    // Everything the server would fetch goes through the global fetch of this process, the
    // library's default provider included. The only requests allowed are the ones of the test
    // client, to the server itself.
    vi.stubGlobal('fetch', (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      requested.push(String(input instanceof Request ? input.url : input))

      return realFetch(input, init)
    })

    try {
      await rpc(url, 'tools/call', { arguments: {}, name: 'docs-list' })
      await rpc(url, 'tools/call', { arguments: { id: 'componenten-tekst-heading' }, name: 'docs-show' })
    } finally {
      vi.unstubAllGlobals()
    }

    expect(requested.length).toBeGreaterThan(0)
    expect(requested.every((address) => address.startsWith(new URL(url).origin))).toBe(true)
  })

  it('refuses GET and DELETE, which would open streams and sessions', async () => {
    const url = await start()

    for (const method of ['GET', 'DELETE', 'PUT']) {
      const response = await fetch(url, { method })

      expect(response.status).toBe(405)
      expect(response.headers.get('allow')).toBe('POST')
    }
  })

  it('answers 404 for every other path, and the same for each', async () => {
    const url = await start()
    const origin = new URL(url).origin
    const bodies = new Set<string>()

    for (const pathname of ['/manifests/components.json', '/mcp/x', '/index.json', '/..%2f..%2fetc/passwd', '/mcpx']) {
      const response = await fetch(origin + pathname, { body: '{}', method: 'POST' })

      expect(response.status).toBe(404)
      bodies.add(await response.text())
    }

    expect(bodies).toEqual(new Set(['Not found']))
  })

  it('refuses a body above the limit', async () => {
    const url = await start({ maxBodyBytes: 1024 })
    const response = await fetch(url, {
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'initialize', params: { padding: 'x'.repeat(2048) } }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    expect(response.status).toBe(413)
  })

  it('answers broken input with an error, and keeps running', async () => {
    const url = await start()
    const broken = await fetch(url, {
      body: '{"jsonrpc":',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    const wrongType = await fetch(url, { body: 'hello', headers: { 'content-type': 'text/plain' }, method: 'POST' })
    const { message } = await rpc(url, 'tools/list')

    expect(broken.status).toBeGreaterThanOrEqual(400)
    expect(wrongType.status).toBe(415)
    expect(message.result.tools).toHaveLength(3)
  })

  it('sets no cookies and no headers for other sites, and logs nothing about a request', async () => {
    const url = await start()
    const { response } = await rpc(url, 'tools/call', { arguments: { id: 'secret-looking-id' }, name: 'docs-show' })

    expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect([...response.headers.keys()].filter((name) => name.startsWith('access-control'))).toEqual([])
    expect(logged.join('\n')).not.toContain('secret-looking-id')
  })
})
