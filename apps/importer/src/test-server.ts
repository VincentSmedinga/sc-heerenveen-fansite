import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

import { createServer } from 'node:http'

import type { FetcherOptions } from './fetcher.ts'

import { createFetcher } from './fetcher.ts'

export type Handler = (request: IncomingMessage, response: ServerResponse) => void

export type RecordedRequest = {
  headers: IncomingHttpHeaders
  method: string | undefined
  url: string | undefined
}

export type TestServer = {
  close: () => Promise<void>
  /** Like `http://127.0.0.1:41234`. */
  origin: string
  /** The paths of the requests, to count them. */
  paths: () => (string | undefined)[]
  /** Every request the server got, in order. */
  requests: RecordedRequest[]
}

/**
 * Makes a fetcher that may reach these test servers on this computer. It refuses every other address that is not on
 * the public internet, as the fetcher of the import command does.
 */
export function fetcherFor(servers: TestServer[], options: FetcherOptions = {}) {
  return createFetcher({ ...options, testOrigins: servers.map((server) => server.origin) })
}

/** A handler that answers with a status, headers and a body. */
export function reply(status: number, body: Buffer | string = '', headers: Record<string, string> = {}): Handler {
  return (_request, response) => {
    response.writeHead(status, headers)
    response.end(body)
  }
}

/**
 * Starts a web server on a free port of this computer, for tests that must not ask a real site. `routes` maps a path
 * and query to a handler; any other path is a 404. `host` is what the server listens on: give two servers different
 * names, such as `127.0.0.1` and `localhost`, to get two hosts.
 */
export async function startServer(routes: Record<string, Handler>, host = '127.0.0.1'): Promise<TestServer> {
  const requests: RecordedRequest[] = []
  const server = createServer((request, response) => {
    requests.push({ headers: request.headers, method: request.method, url: request.url })
    const handler = request.url === undefined ? undefined : routes[request.url]
    if (handler === undefined) {
      reply(404, 'Not found')(request, response)
    } else {
      handler(request, response)
    }
  })
  await new Promise<void>((resolve) => server.listen(0, host, resolve))
  const { port } = server.address() as AddressInfo

  return {
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve())
        // The fetcher keeps connections open, and a test that stalls on purpose leaves one hanging.
        server.closeAllConnections()
      }),
    origin: `http://${host}:${port}`,
    paths: () => requests.map((request) => request.url),
    requests,
  }
}
