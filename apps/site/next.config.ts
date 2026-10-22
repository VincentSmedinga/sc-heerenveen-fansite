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
}

export default config
