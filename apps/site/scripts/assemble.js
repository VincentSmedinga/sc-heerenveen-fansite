// Copies the standalone build to a new folder, with the static files next to the server, the way the host needs them.
// Next.js leaves those files out of the standalone folder. CI copies the result to the host, and runs smoke.js on it first.
//
//   node scripts/assemble.js <new folder>
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const [folder] = process.argv.slice(2)

if (folder === undefined) {
  console.error('Usage: node scripts/assemble.js <new folder>')
  process.exit(2)
}

const target = path.resolve(folder)

if (existsSync(target)) {
  console.error(`${target} exists already. Pass a folder that doesn't exist yet.`)
  process.exit(1)
}

const standalone = path.resolve(import.meta.dirname, '../.next/standalone')
const siteFolder = path.join(target, 'apps/site')

mkdirSync(target, { recursive: true })
// The links inside node_modules are relative. Keep them as they are, or they'd point back into the build.
cpSync(standalone, target, { recursive: true, verbatimSymlinks: true })
mkdirSync(path.join(siteFolder, '.next'), { recursive: true })
cpSync(path.resolve(import.meta.dirname, '../.next/static'), path.join(siteFolder, '.next/static'), { recursive: true })
