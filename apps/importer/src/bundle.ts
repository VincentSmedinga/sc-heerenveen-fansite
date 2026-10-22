import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

/**
 * Bundles the import command with everything it imports into one JavaScript file, which cron starts on the host.
 * `pnpm --filter site assemble` puts it in the folder for the host. The file needs no `node_modules`: Node strips no
 * types from a file in `node_modules`, so `@fansite/db`, which is TypeScript, would not run there without a build step.
 */
export async function bundleImporter(outfile: string) {
  await build({
    // Some dependencies are CommonJS and ask for Node's own modules with `require`, which an ES module doesn't have.
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    bundle: true,
    entryPoints: [fileURLToPath(new URL('./import.ts', import.meta.url))],
    format: 'esm',
    logLevel: 'warning',
    outfile,
    platform: 'node',
    target: 'node24',
  })
}
