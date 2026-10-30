import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

import { createMcpServer } from '../src/server.ts'
import { listen } from '../src/test-client.ts'
import { check } from './check.js'

const fixtureDir = path.resolve(import.meta.dirname, '../src/fixtures')

describe('the check of the MCP server on the host', () => {
  const servers = []

  async function start(server) {
    servers.push(server)

    return listen(server)
  }

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))))
  })

  it('passes against the app with the manifests of the build', async () => {
    const url = await start(createMcpServer({ storybookDir: fixtureDir }))

    await expect(check(url, fixtureDir)).resolves.toEqual({ components: 2 })
  })

  it('says the host answered, and where to look, when the web server sends an HTML 404 without reaching the app', async () => {
    const url = await start(
      createServer((request, response) => {
        response.writeHead(404, { 'content-type': 'text/html', server: 'LiteSpeed' })
        response.end('<!DOCTYPE html><title>404 Not Found</title>')
      }),
    )

    await expect(check(url, fixtureDir)).rejects.toThrow(
      /initialize answered 404 \(content-type: text\/html, server: LiteSpeed\)\. That is the page of the web server, not of the app.*Setup Node\.js App.*docs\/designsysteem-publiceren\.md/,
    )
  })

  it('says the app answered when the path is not one the app serves', async () => {
    const url = await start(createMcpServer({ storybookDir: fixtureDir }))

    await expect(check(url.replace('/mcp', '/other'), fixtureDir)).rejects.toThrow(
      /initialize answered 404 \(content-type: text\/plain.*The app answered, so the request reached it/,
    )
  })

  it('points to stderr.log when the host answers with an error', async () => {
    const url = await start(
      createServer((request, response) => {
        response.writeHead(503, { 'content-type': 'text/html' })
        response.end('<title>503</title>')
      }),
    )

    await expect(check(url, fixtureDir)).rejects.toThrow(/answered 503.*the app probably does not start.*stderr\.log/)
  })

  it('prints the failure as an annotation of the run on GitHub, and exits with 1', async () => {
    const url = await start(
      createServer((request, response) => {
        response.writeHead(404, { 'content-type': 'text/html', server: 'LiteSpeed' })
        response.end('<title>404 Not Found</title>')
      }),
    )
    const run = promisify(execFile)(
      process.execPath,
      [path.join(import.meta.dirname, 'check.js'), url, fixtureDir, '0'],
      {
        env: { ...process.env, GITHUB_ACTIONS: 'true' },
      },
    )

    await expect(run).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringMatching(/^::error title=Check ds\.heerenveen\.org\/mcp failed::.*initialize answered 404/m),
    })
  })
})
