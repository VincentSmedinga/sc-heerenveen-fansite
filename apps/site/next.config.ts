import type { NextConfig } from 'next'

import { loadEnvConfig } from '@next/env'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))

// Next.js reads .env files only from this folder. We keep one .env in the root of the repository, so load that one too.
// Without the last argument, Next.js hands back the files it already loaded from this folder.
loadEnvConfig(root, process.env['NODE_ENV'] !== 'production', undefined, true)

const config: NextConfig = {
  // `next dev` would write an AGENTS.md here. The rules for agents live in the AGENTS.md in the root.
  agentRules: false,
  // The build holds only the files the server uses, with a server.js to start it. CI builds it and copies it to the host.
  output: 'standalone',
  // In a workspace the trace of used files must start at the root, or the files of the other packages are left out.
  outputFileTracingRoot: root,
  poweredByHeader: false,
  // The packages in this workspace are TypeScript source.
  transpilePackages: ['@fansite/db', '@fansite/design-system', '@fansite/shared'],
  // `import.meta.glob(..., { query: '?raw' })` gives the text of a Markdown file, put into the code when the site is built.
  // The page Wat is er nieuw reads CHANGELOG.md this way (see src/releases.ts). Vitest knows `?raw` by itself.
  turbopack: { rules: { '*.md': { condition: { query: '?raw' }, type: 'raw' } } },
}

export default config
