// Copies the standalone build to a new folder, with the static files next to the server, the way the host needs them.
// Next.js leaves those files out of the standalone folder, and the SQL files of the migrations too: it only follows what the
// code imports. The importer goes in the same folder, as one file. CI copies the result to the host, and runs smoke.js and
// the importer on it first.
// The folder has no symbolic links: pnpm's node_modules is flattened into real folders (see flattenModules).
//
//   node scripts/assemble.js <new folder>
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import { bundleImporter } from '../../importer/src/bundle.ts'

/** Lists the folders and files inside a folder, without following links. */
function entries(folder) {
  return readdirSync(folder).map((name) => ({
    full: path.join(folder, name),
    name,
    stat: lstatSync(path.join(folder, name)),
  }))
}

/** Finds every symbolic link below a folder. */
function findLinks(folder) {
  return entries(folder).flatMap(({ full, stat }) =>
    stat.isSymbolicLink() ? [full] : stat.isDirectory() ? findLinks(full) : [],
  )
}

/**
 * Replaces pnpm's node_modules, a store of folders that point at each other with links, by one flat node_modules of real
 * folders. On mijn.host Node keeps the path through a link when it loads a module of Next.js. It then looks for the
 * packages next to Next.js in the wrong place, and the first request ends in "Cannot find module '@swc/helpers/...'". The
 * smoke test can't see that, because it runs on another machine. Without links there is nothing to follow.
 */
function flattenModules(root) {
  const store = path.join(root, 'node_modules/.pnpm')
  const flat = path.join(root, 'node_modules')
  const copied = new Map()

  for (const { full: folder, name: id, stat } of entries(store)) {
    // pnpm's own node_modules in the store holds only links.
    if (id === 'node_modules' || !stat.isDirectory()) continue

    for (const { full, name } of ownPackages(path.join(folder, 'node_modules'))) {
      if (copied.has(name)) {
        throw new Error(
          `${name} is in the build twice, as ${copied.get(name)} and ${id}. A flat node_modules holds one version.`,
        )
      }

      copied.set(name, id)
      cpSync(full, path.join(flat, name), { dereference: true, recursive: true })
    }
  }

  rmSync(store, { recursive: true })

  // The links that pointed into the store, such as apps/site/node_modules/next, now point nowhere.
  for (const link of findLinks(root)) {
    if (!existsSync(link)) rmSync(link)
  }

  const left = findLinks(root)

  if (left.length > 0) {
    throw new Error(`The folder still has symbolic links, which the host can't follow reliably:\n${left.join('\n')}`)
  }
}

/** The packages that sit in a folder of pnpm's store as real folders, as opposed to the links to their dependencies. */
function ownPackages(modules) {
  return entries(modules).flatMap(({ full, name, stat }) => {
    if (stat.isSymbolicLink()) return []
    if (!name.startsWith('@')) return [{ full, name }]

    return entries(full)
      .filter((inner) => !inner.stat.isSymbolicLink())
      .map((inner) => ({ full: inner.full, name: `${name}/${inner.name}` }))
  })
}

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
// The links inside node_modules are relative. Copy them as they are, or they'd point back into the build.
cpSync(standalone, target, { recursive: true, verbatimSymlinks: true })
flattenModules(target)
mkdirSync(path.join(siteFolder, '.next'), { recursive: true })
cpSync(path.resolve(import.meta.dirname, '../.next/static'), path.join(siteFolder, '.next/static'), { recursive: true })
// The standalone folder leaves out public as well: the picture for shared links is in it.
cpSync(path.resolve(import.meta.dirname, '../public'), path.join(siteFolder, 'public'), { recursive: true })
// The server runs the migrations when it starts. It looks for them in packages/db/drizzle, two folders above apps/site, as in
// the repository (see migrationsFolder in src/instrumentation-node.ts).
cpSync(path.resolve(import.meta.dirname, '../../../packages/db/drizzle'), path.join(target, 'packages/db/drizzle'), {
  recursive: true,
})
// Cron starts the importer on the host, from apps/importer/import.mjs (see docs/acceptatieomgeving.md). It is one file with
// everything it needs, so it uses no node_modules. Deployed together, the importer keeps in step with the schema, which
// the site brings up to date when it starts.
await bundleImporter(path.join(target, 'apps/importer/import.mjs'))
