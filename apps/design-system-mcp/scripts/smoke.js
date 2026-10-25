// Starts the bundle the way the host does, twice, in a folder laid out like
// domains/ds.heerenveen.org/ with the Storybook build as public_html next to the app, and
// checks the answers against that build. Two processes, because the host may start more than
// one: a client that starts on one and carries on on the other must not notice. CI runs this on
// the build it is about to deploy, so an app that doesn't start or can't read the manifests
// never leaves the runner.
//
//   pnpm --filter @fansite/design-system-mcp build
//   node scripts/smoke.js <folder of the Storybook build>
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import { callTool, check, rpc } from './check.js'

const [storybookDir] = process.argv.slice(2)

if (storybookDir === undefined) {
  console.error('Usage: node scripts/smoke.js <folder of the Storybook build>')
  process.exit(2)
}

const firstPort = Number(process.env['SMOKE_PORT'] ?? 3124)
const urls = [firstPort, firstPort + 1].map((port) => `http://127.0.0.1:${port}/mcp`)
const site = await mkdtemp(path.join(tmpdir(), 'ds-mcp-smoke-'))
const children = []

try {
  await mkdir(path.join(site, 'mcp'))
  await cp(path.resolve(import.meta.dirname, '../dist/server.mjs'), path.join(site, 'mcp/server.mjs'))
  await cp(path.resolve(storybookDir), path.join(site, 'public_html'), { recursive: true })

  // No STORYBOOK_DIR: the app finds the document root next to its own folder, as it must on the
  // host.
  const env = { ...process.env }
  delete env['STORYBOOK_DIR']

  for (const url of urls) {
    const port = new URL(url).port

    children.push(
      spawn(process.execPath, [path.join(site, 'mcp/server.mjs')], {
        env: { ...env, PORT: port },
        stdio: ['ignore', 'inherit', 'inherit'],
      }),
    )
  }

  const built = path.join(site, 'public_html')
  const deadline = Date.now() + 15_000

  for (const url of urls) {
    for (;;) {
      try {
        const { components } = await check(url, built)

        console.log(`${url} answers, and docs-list names all ${components} components of the build.`)
        break
      } catch (error) {
        if (Date.now() >= deadline || children.some((child) => child.exitCode !== null)) {
          throw error
        }

        await sleep(300)
      }
    }
  }

  // A client starts on one process and carries on on the other, with the session of the first.
  const [first, second] = urls
  const started = await fetch(first, {
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'initialize',
      params: { capabilities: {}, clientInfo: { name: 'smoke', version: '1' }, protocolVersion: '2025-06-18' },
    }),
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    method: 'POST',
  })

  assert.equal(started.status, 200)
  assert.equal(started.headers.get('mcp-session-id'), null, 'the server must give no session')
  assert.ok((await rpc(second, 'tools/list', {})).tools.length === 3)
  assert.ok((await callTool(second, 'docs-list', {})).length > 0)
  console.log('A second process answers a client that started on the first.')

  for (const url of urls) {
    const other = await fetch(new URL('/index.json', url))

    assert.equal(other.status, 404, `/index.json answered ${other.status}, and the app must answer only /mcp`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  for (const child of children) {
    child.kill()
  }

  await rm(site, { force: true, recursive: true })
}
