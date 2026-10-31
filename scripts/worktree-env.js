// Gives every worktree a database and a block of ports of its own, so sessions that work next
// to each other on one computer don't meet on the shared ones. The folder name of the worktree
// decides both: the same folder always gets the same database and the same ports, and another
// folder gets others. The decision "Elke werkmap heeft een eigen database en eigen poorten" in
// docs/beslissingen.md says why.
//
//   node scripts/worktree-env.js                      shows what this folder gets
//   node scripts/worktree-env.js run [--database] [--ports site,mail] -- <command> <arguments>
//   node scripts/worktree-env.js drop                 drops the database of this worktree
//
// `run` puts the values in the environment of the command. `{SITE_PORT}` and the other port
// names in its arguments become the port, for a tool that wants it as an option. `--ports` is
// the ports the command listens on: when one of them is busy, nothing starts and the message
// names the port and the worktree. `--database` makes the database of the worktree, with the
// tables and the seed, the first time. A normal checkout, a folder that isn't a worktree and CI
// get the values they always had (3000, 6006, 3123, 3124, 3125, 2525 and the database
// `fansite`), and a variable that is set already wins over the derived one.
//
// What decides something is a function without side effects, exported for the tests. What
// touches the computer (files, ports, processes) is below that, and only runs when this file is
// started directly.
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { parseEnv } from 'node:util'

/** A problem we expect: it is shown as a message, without a stack. */
export class WorktreeEnvError extends Error {
  constructor(message, exitCode = 1) {
    super(message)
    this.exitCode = exitCode
  }
}

/**
 * The ports of a server, in the order of a block: its name in the arguments, the variable that
 * holds it, the port a normal checkout and CI use, and what it is, for a message.
 */
export const portDefinitions = [
  { defaultPort: 3000, label: 'the site', name: 'site', variable: 'SITE_PORT' },
  { defaultPort: 6006, label: 'Storybook', name: 'storybook', variable: 'STORYBOOK_PORT' },
  { defaultPort: 3123, label: 'the smoke test', name: 'smoke', variable: 'SMOKE_PORT' },
  { defaultPort: 3124, label: 'the site of the accessibility checks', name: 'e2e', variable: 'E2E_PORT' },
  {
    defaultPort: 3125,
    label: 'the site of the accessibility checks without a database',
    name: 'e2e-without-database',
    variable: 'E2E_WITHOUT_DATABASE_PORT',
  },
  { defaultPort: 2525, label: 'the fake mail server', name: 'mail', variable: 'FAKE_MAIL_PORT' },
]

/**
 * The blocks start here and are `blockSize` ports wide, `blockCount` of them in a row. That is
 * 24000 to 27999: above the ports of tools, below the ports the system hands out itself (from
 * 32768 on Linux, 49152 on macOS). A block is wider than the six ports, to leave room.
 */
export const firstPort = 24_000
export const blockSize = 8
export const blockCount = 500

/** The name of the database a normal checkout and CI use. A worktree gets `fansite_<name>`. */
export const defaultDatabase = 'fansite'

const longestName = 32

const hashOf = (text) => createHash('sha256').update(text).digest()

/** The message when a port of the block of a worktree is busy. Nothing was started. */
export function busyMessage({ busy, worktree }) {
  return [
    ...busy.map(
      ({ label, port }) =>
        `Port ${port} (${label}) is busy. It is in the block of ports of the worktree "${worktree}", so it is not another worktree's.`,
    ),
    `Stop what holds ${busy.length === 1 ? 'it' : 'them'} (\`lsof -i :${busy[0].port}\` says what it is), or set ${busy
      .map(({ variable }) => variable)
      .join(' and ')} to another port for this command. Nothing was started.`,
  ].join('\n')
}

/**
 * The address of the database of a worktree: the one in `url` with the name `fansite_<slug>`.
 * Only a database called `fansite` is replaced: another name was chosen by someone, and a URL
 * that isn't one is left to the tools, which complain about it themselves.
 */
export function databaseUrlOf(url, slug) {
  let parsed

  try {
    parsed = new URL(url)
  } catch {
    return undefined
  }

  if (parsed.protocol !== 'mysql:' || parsed.pathname !== `/${defaultDatabase}`) {
    return undefined
  }

  parsed.pathname = `/${defaultDatabase}_${slug}`

  return parsed.href
}

/**
 * Everything a folder gets: the worktree it is, the values to put in the environment (not those
 * that are set already) and which of them are derived. `databaseUrl` is the address from the
 * environment or the .env in the root, if any.
 */
export function deriveEnv({ databaseUrl, env, folder, linked }) {
  const worktree = worktreeNameOf({ env, folder, linked })
  const slug = slugOf(worktree)
  const ports = slug === undefined ? undefined : portsOf(worktree)
  const values = {}
  const derived = []

  for (const { defaultPort, name, variable } of portDefinitions) {
    if (env[variable] !== undefined && env[variable] !== '') {
      continue
    }

    values[variable] = String(ports === undefined ? defaultPort : ports[name])

    if (ports !== undefined) {
      derived.push(name)
    }
  }

  const database =
    slug === undefined || (env['DATABASE_URL'] ?? '') !== '' || databaseUrl === undefined
      ? undefined
      : databaseUrlOf(databaseUrl, slug)

  if (database !== undefined) {
    values['DATABASE_URL'] = database
  }

  return {
    database,
    databaseName: database === undefined ? undefined : new URL(database).pathname.slice(1),
    derived,
    slug,
    values,
    worktree,
  }
}

/** What `show` prints: the worktree and what it gets, one fact per line. */
export function describe({ databaseName, derived, slug, values, worktree }) {
  if (slug === undefined) {
    return [
      'No worktree: this folder gets the defaults, as a normal checkout and CI do.',
      ...portDefinitions.map(
        ({ name, variable }) => `${name.padEnd(22)} ${variable}=${values[variable] ?? 'set already'}`,
      ),
      'database               DATABASE_URL as it is',
    ].join('\n')
  }

  return [
    `Worktree: ${worktree} (${slug})`,
    ...portDefinitions.map(({ name, variable }) => {
      const how = derived.includes(name) ? 'derived' : 'set already'

      return `${name.padEnd(22)} ${variable}=${values[variable] ?? process.env[variable]} (${how})`
    }),
    databaseName === undefined
      ? 'database               DATABASE_URL as it is (set already, or not the default database)'
      : `database               ${databaseName}`,
  ].join('\n')
}

/**
 * The arguments with `{SITE_PORT}` and the other port variables filled in, from the values and
 * the environment, so a tool that wants its port as an option gets the one of this worktree.
 */
export function fillPorts(args, { env, values }) {
  const variables = portDefinitions.map(({ variable }) => variable)

  return args.map((argument) =>
    argument.replaceAll(/\{([A-Z_]+)\}/g, (match, variable) =>
      variables.includes(variable) ? (env[variable] ?? values[variable] ?? match) : match,
    ),
  )
}

/** Reads the arguments of the command line: which command, its options and what it runs. */
export function parseArguments(argv) {
  const [command = 'show', ...rest] = argv

  if (command === 'show' || command === 'drop') {
    if (rest.length > 0) {
      throw new WorktreeEnvError(`"${command}" takes no arguments.`, 2)
    }

    return { command }
  }

  if (command !== 'run') {
    throw new WorktreeEnvError(`Unknown command "${command}". Use show, run or drop.`, 2)
  }

  const separator = rest.indexOf('--')

  if (separator === -1 || separator === rest.length - 1) {
    throw new WorktreeEnvError(
      'Say what to run after "--": node scripts/worktree-env.js run [--database] [--ports a,b] -- <command>',
      2,
    )
  }

  const options = rest.slice(0, separator)
  const run = { command, database: false, ports: [], run: rest.slice(separator + 1) }

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index]

    if (option === '--database') {
      run.database = true
    } else if (option === '--ports') {
      const names = (options[(index += 1)] ?? '').split(',').filter(Boolean)
      const unknown = names.find((name) => !portDefinitions.some((definition) => definition.name === name))

      if (names.length === 0 || unknown !== undefined) {
        throw new WorktreeEnvError(
          `--ports takes names from ${portDefinitions.map(({ name }) => name).join(', ')}${unknown === undefined ? '' : `, not "${unknown}"`}.`,
          2,
        )
      }

      run.ports.push(...names)
    } else {
      throw new WorktreeEnvError(`Unknown option "${option}".`, 2)
    }
  }

  return run
}

/** The six ports of a worktree, as an object from the name in `portDefinitions`. */
export function portsOf(name) {
  const slot = hashOf(name).readUInt32BE(0) % blockCount
  const start = firstPort + slot * blockSize

  return Object.fromEntries(portDefinitions.map(({ name: port }, index) => [port, start + index]))
}

/** The port a derived server uses, with what it is, for the ports that a command asked for. */
export function portsToCheck({ derived, names, values }) {
  return portDefinitions
    .filter(({ name }) => names.includes(name) && derived.includes(name))
    .map(({ label, name, variable }) => ({ label, name, port: Number(values[variable]), variable }))
}

/**
 * The part of a worktree folder's name that goes into the database name: lower case letters,
 * digits and underscores. A name that holds none of those, or that is too long, gets a short
 * hash of the whole name, so two folders never end up with the same name. Nothing for a name
 * that is empty.
 */
export function slugOf(name) {
  const trimmed = (name ?? '').trim()

  if (trimmed === '') {
    return undefined
  }

  const slug = trimmed
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '_')
    .replaceAll(/^_+|_+$/g, '')
  const hash = hashOf(trimmed).toString('hex').slice(0, 7)

  if (slug === '') {
    return `w_${hash}`
  }

  return slug.length > longestName ? `${slug.slice(0, longestName - 8).replace(/_+$/, '')}_${hash}` : slug
}

/**
 * The name of the worktree, or nothing when this folder gets the defaults: CI, a folder that
 * isn't a linked worktree, and a name that someone set to nothing. `WORKTREE_NAME` in the
 * environment wins over the folder; an empty one turns it off, which `pnpm review` uses.
 */
export function worktreeNameOf({ env, folder, linked }) {
  const set = env['WORKTREE_NAME']

  if (set !== undefined) {
    return set.trim() === '' ? undefined : set.trim()
  }

  if (env['CI'] !== undefined && env['CI'] !== '') {
    return undefined
  }

  return linked ? path.basename(folder) : undefined
}

// Below here the computer is touched. Nothing runs when a test imports this file.

/** The folder of the repository this file is in. */
const root = path.resolve(import.meta.dirname, '..')

/** Runs the helper of `packages/db` that makes or drops the database. */
function databaseCommand(action, env) {
  const result = spawnSync(process.execPath, [path.join(root, 'packages/db/src/worktree-database.ts'), action], {
    env,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new WorktreeEnvError(`Could not ${action} the database.`, result.status ?? 1)
  }
}

/** The `DATABASE_URL` in the .env in the root, if there is one. */
function databaseUrlFromFile(folder) {
  const file = path.join(folder, '.env')

  return existsSync(file) ? parseEnv(readFileSync(file, 'utf8'))['DATABASE_URL'] : undefined
}

/** Resolves with the ports of `ports` that something already listens on. */
async function findBusy(ports) {
  const busy = []

  for (const entry of ports) {
    // Without a host, it conflicts with a server on any address of this computer.
    const free = await new Promise((resolve) => {
      const server = net.createServer()

      server.once('error', () => resolve(false))
      server.listen(entry.port, () => server.close(() => resolve(true)))
    })

    if (!free) {
      busy.push(entry)
    }
  }

  return busy
}

/** Whether the folder is a linked git worktree: there `.git` is a file, not a folder. */
function isLinkedWorktree(folder) {
  try {
    return statSync(path.join(folder, '.git')).isFile()
  } catch {
    return false
  }
}

async function main(argv) {
  const parsed = parseArguments(argv)
  const env = process.env
  const derivation = deriveEnv({
    databaseUrl: env['DATABASE_URL'] ?? databaseUrlFromFile(root),
    env,
    folder: root,
    linked: isLinkedWorktree(root),
  })
  const childEnv = { ...env, ...derivation.values }

  if (parsed.command === 'show') {
    console.log(describe(derivation))

    return 0
  }

  if (parsed.command === 'drop') {
    if (derivation.database === undefined) {
      throw new WorktreeEnvError(
        'This folder has no database of its own to drop: it is not a worktree, or DATABASE_URL was set to something else. ' +
          'The database `fansite` is never dropped by this command.',
      )
    }

    databaseCommand('drop', childEnv)

    return 0
  }

  const busy = await findBusy(
    portsToCheck({ derived: derivation.derived, names: parsed.ports, values: derivation.values }),
  )

  if (busy.length > 0) {
    throw new WorktreeEnvError(busyMessage({ busy, worktree: derivation.worktree }))
  }

  if (parsed.database && derivation.database !== undefined) {
    databaseCommand('ensure', childEnv)
  }

  const [command, ...args] = fillPorts(parsed.run, { env, values: derivation.values })
  const child = spawn(command, args, { env: childEnv, stdio: 'inherit' })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal))
  }

  return new Promise((resolve) => {
    child.once('error', (error) => {
      console.error(`Could not start ${command}: ${error.message}`)
      resolve(127)
    })
    child.once('exit', (code, signal) => resolve(code ?? (signal === undefined ? 1 : 128)))
  })
}

if (import.meta.main) {
  try {
    process.exitCode = await main(process.argv.slice(2))
  } catch (error) {
    if (!(error instanceof WorktreeEnvError)) {
      throw error
    }

    console.error(error.message)
    process.exitCode = error.exitCode
  }
}
