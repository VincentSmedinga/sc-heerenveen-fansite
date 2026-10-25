import { createStorybookMcpHandler } from '@storybook/mcp'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

import { createManifestProvider } from './manifests.ts'

export type McpServerOptions = {
  /** Writes one line to the log. It never gets the content of a request or an address of a visitor. */
  log?: (line: string) => void
  /** The biggest request body we read. MCP requests for the documentation are a few hundred bytes. */
  maxBodyBytes?: number
  /** The folder of the published Storybook: the one that holds `manifests/`. */
  storybookDir: string
  /** How long one request may take before the visitor gets a 504. */
  timeoutMs?: number
}

// The paths one request may have. The host may or may not strip the /mcp it mounts the app on.
const mcpPaths = new Set(['/', '/mcp', '/mcp/'])
// What the handler needs of the request. Nothing else is passed on, and above all not the session of the client: every
// request is answered on its own.
const forwardedHeaders = ['accept', 'content-type', 'mcp-protocol-version']
const textHeaders = {
  'cache-control': 'no-store',
  'content-type': 'text/plain; charset=utf-8',
  'x-content-type-options': 'nosniff',
}

class TooLargeError extends Error {}

/**
 * The MCP server of the design system: `@storybook/mcp` over HTTP, read-only, without sessions.
 *
 * The library keeps sessions in memory and opens a stream for every `GET`. A host that starts more than one process, or
 * restarts one, would break a client that holds a session, and a public server would have to bound that memory. So
 * every request gets a handler of its own, which is gone when the request ends, `GET` and `DELETE` are refused, and the
 * session id of the client is neither read nor given. The protocol allows this: a server may answer without a session.
 */
export function createMcpServer({
  log = () => {},
  maxBodyBytes = 64 * 1024,
  storybookDir,
  timeoutMs = 20_000,
}: McpServerOptions): Server {
  const manifestProvider = createManifestProvider(storybookDir)

  async function answer(request: IncomingMessage, response: ServerResponse) {
    let pathname: string

    try {
      pathname = new URL(request.url ?? '', 'http://localhost').pathname
    } catch {
      return send(response, 404, 'Not found')
    }

    if (!mcpPaths.has(pathname)) {
      return send(response, 404, 'Not found')
    }

    if (request.method !== 'POST') {
      return send(response, 405, 'Method not allowed', { allow: 'POST' })
    }

    let body: Buffer

    try {
      body = await readBody(request, maxBodyBytes)
    } catch (error) {
      if (error instanceof TooLargeError) {
        return send(response, 413, 'Request body too large', { connection: 'close' })
      }

      throw error
    }

    const headers = new Headers()

    for (const name of forwardedHeaders) {
      const value = request.headers[name]

      if (typeof value === 'string') {
        headers.set(name, value)
      }
    }

    // The address is made up on purpose: the provider reads from disk and never from the address of the request.
    const mcpRequest = new Request('http://localhost/mcp', { body: new Uint8Array(body), headers, method: 'POST' })
    const timeout = AbortSignal.timeout(timeoutMs)
    const result = await Promise.race([
      handle(mcpRequest),
      new Promise<never>((_resolve, reject) => {
        timeout.addEventListener('abort', () => reject(new Error('Timeout')), { once: true })
      }),
    ])

    response.writeHead(result.status, result.headers)
    response.end(result.body)
  }

  async function handle(mcpRequest: Request) {
    const handler = await createStorybookMcpHandler({ manifestProvider })
    const mcpResponse = await handler(mcpRequest)
    const headers: Record<string, string> = {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    }
    const contentType = mcpResponse.headers.get('content-type')

    if (contentType !== null) {
      headers['content-type'] = contentType
    }

    return { body: Buffer.from(await mcpResponse.arrayBuffer()), headers, status: mcpResponse.status }
  }

  const server = createServer((request, response) => {
    answer(request, response).catch((error: unknown) => {
      // The name only: a message can quote the request.
      log(`Request failed: ${error instanceof Error ? error.name : 'unknown error'}`)

      if (!response.headersSent) {
        const timedOut = error instanceof Error && error.message === 'Timeout'

        send(response, timedOut ? 504 : 500, timedOut ? 'Gateway timeout' : 'Internal server error')
      } else {
        response.destroy()
      }
    })
  })

  server.headersTimeout = 10_000
  server.requestTimeout = 30_000

  return server
}

async function readBody(request: IncomingMessage, limit: number): Promise<Buffer> {
  const declared = Number(request.headers['content-length'])

  if (Number.isFinite(declared) && declared > limit) {
    throw new TooLargeError()
  }

  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    size += (chunk as Buffer).length

    if (size > limit) {
      throw new TooLargeError()
    }

    chunks.push(chunk as Buffer)
  }

  return Buffer.concat(chunks)
}

function send(response: ServerResponse, status: number, text: string, extra: Record<string, string> = {}) {
  response.writeHead(status, { ...textHeaders, ...extra })
  response.end(text)
}
