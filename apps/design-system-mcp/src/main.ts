import path from 'node:path'

import { createMcpServer } from './server.ts'

// The folder the host keeps next to the app: domains/ds.heerenveen.org/public_html is the
// document root of Storybook, and the app runs from domains/ds.heerenveen.org/mcp
// (docs/designsysteem-publiceren.md). A path in STORYBOOK_DIR wins.
const storybookDir = process.env['STORYBOOK_DIR'] ?? path.resolve(import.meta.dirname, '../public_html')
const port = Number(process.env['PORT'] ?? 3000)

// A request that fails is answered with a 500 and logged, and the process stays up. This is for
// what escapes that.
process.on('unhandledRejection', (reason) => {
  console.error(`Unhandled rejection: ${reason instanceof Error ? reason.name : 'unknown error'}`)
})

const server = createMcpServer({ log: (line) => console.error(line), storybookDir })

// The host starts the app and replaces the address and the port it listens on, as it does for
// the site.
server.listen(port, '127.0.0.1', () => {
  console.error('MCP server of the design system started')
})
