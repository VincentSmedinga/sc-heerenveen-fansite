import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

/** Starts a server on a free port of this computer and returns its address. */
export async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`
}

/**
 * Sends one JSON-RPC request, the way an MCP client does, and returns the message from the answer. The server answers
 * with an event stream, so the message is the `data:` line.
 */
export async function rpc(url: string, method: string, params: Record<string, unknown> = {}, id = 1) {
  const response = await fetch(url, {
    body: JSON.stringify({ id, jsonrpc: '2.0', method, params }),
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    method: 'POST',
  })
  const text = await response.text()
  const data = text
    .split('\n')
    .find((line) => line.startsWith('data: '))
    ?.slice('data: '.length)

  return { message: data === undefined ? undefined : JSON.parse(data), response, text }
}

export const initializeParams = {
  capabilities: {},
  clientInfo: { name: 'test', version: '1' },
  protocolVersion: '2025-06-18',
}
