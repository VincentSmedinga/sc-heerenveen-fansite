// Bundles the server and everything it imports into one file, dist/server.mjs. The host runs
// that one file, without a node_modules: Node strips no types from a file in node_modules, and
// the folder on the host has no pnpm.
import { build } from 'esbuild'
import path from 'node:path'

await build({
  // Some dependencies are CommonJS and ask for Node's own modules with `require`, which an ES
  // module doesn't have.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  bundle: true,
  entryPoints: [path.resolve(import.meta.dirname, '../src/main.ts')],
  format: 'esm',
  logLevel: 'warning',
  outfile: path.resolve(import.meta.dirname, '../dist/server.mjs'),
  platform: 'node',
  target: 'node24',
})
