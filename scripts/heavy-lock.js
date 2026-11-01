// Lets the heavy checks run one at a time on one computer, whatever the worktree. Sessions that
// work next to each other each start `next build`, the accessibility checks, the story checks
// and the Storybook build, and together they take every core. The decision "De zware controles
// delen de machine" in docs/beslissingen.md says why.
//
//   node scripts/heavy-lock.js -- <command> [...]
//
// Waits until it holds the slot, runs the command and gives the slot back when the command ends
// or this process is stopped. The slot is a folder in the temp folder of the user, outside the
// repository, that holds who has it. A slot that is held too long (a run that hangs) or whose
// owner has gone (a process that was killed) is taken over, and a wait that lasts too long runs
// the command anyway, so a stuck run never blocks anyone for good. CI and `HEAVY_LOCK=off` run
// the command at once: a runner has one job.
//
// What decides something is a function without side effects, exported for the tests. What
// touches the computer is below that, and only runs when this file is started directly.
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

/** How long a run may hold the slot, and how long a run waits for it, in minutes. */
export const defaultTimeoutMinutes = 30

/** How often a waiting run looks at the slot, and how often it says it still waits. */
export const pollMilliseconds = 2000
export const reminderMilliseconds = 60_000

/** How long a slot may exist without an owner entry: a run stopped between the two steps. */
export const ownerlessMilliseconds = 10_000

/** A problem we expect: it is shown as a message, without a stack. */
export class HeavyLockError extends Error {
  constructor(message, exitCode = 1) {
    super(message)
    this.exitCode = exitCode
  }
}

/** The text of a duration for a message: "45 s", "3 min 20 s". */
export function durationText(milliseconds) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000))

  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

/** Whether the run that wrote `owner` has taken the slot longer than `timeout` ago. */
export function isExpired({ now, owner, timeoutMilliseconds }) {
  return now - owner.startedAt > timeoutMilliseconds
}

/** Whether the command runs without the slot: CI, or someone who turned it off. */
export function isSkipped(env) {
  return (env['CI'] ?? '') !== '' || env['HEAVY_LOCK'] === 'off'
}

/**
 * The folder of the slot: `HEAVY_LOCK_DIR` for the tests, otherwise a folder in the temp folder
 * of the user, which is on the computer and not in a repository.
 */
export function lockFolderOf(env, temporaryFolder = tmpdir()) {
  const set = env['HEAVY_LOCK_DIR']

  return set === undefined || set === '' ? path.join(temporaryFolder, 'fansite-heavy-lock') : set
}

/** Reads the arguments of the command line: what to run after the "--". */
export function parseArguments(argv) {
  const separator = argv.indexOf('--')

  if (separator !== 0 || separator === argv.length - 1) {
    throw new HeavyLockError('Say what to run after "--": node scripts/heavy-lock.js -- <command> [...]', 2)
  }

  return { run: argv.slice(1) }
}

/** Sleep between two looks of a waiting run; `HEAVY_LOCK_POLL_MILLISECONDS` is for tests. */
export function pollOf(env) {
  const milliseconds = Number(env['HEAVY_LOCK_POLL_MILLISECONDS'])

  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : pollMilliseconds
}

/** The time-out from `HEAVY_LOCK_TIMEOUT_MINUTES`, or the default if that is not a number. */
export function timeoutOf(env) {
  const minutes = Number(env['HEAVY_LOCK_TIMEOUT_MINUTES'])

  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : defaultTimeoutMinutes * 60_000
}

/** The line that says who has the slot and for how long, for a run that has to wait. */
export function waitingMessage({ now, owner }) {
  const where = path.basename(owner.folder)

  return `Waiting for the slot of the heavy checks. It is held by \`${owner.command}\` in ${where} (process ${owner.pid}), since ${durationText(now - owner.startedAt)}. This run starts when that one ends.`
}

// Below here the computer is touched. Nothing runs when a test imports this file.

/** Whether a process with this id is still running. */
function isAlive(pid) {
  try {
    process.kill(pid, 0)

    return true
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return error.code === 'EPERM'
  }
}

/** When the folder of the slot was made; now when it is gone, so no new slot is taken over. */
function modifiedAt(folder) {
  try {
    return statSync(folder).mtimeMs
  } catch {
    return Date.now()
  }
}

function readOwner(folder) {
  try {
    return JSON.parse(readFileSync(path.join(folder, 'owner.json'), 'utf8'))
  } catch {
    return undefined
  }
}

function release(folder, token) {
  // Not the slot of a run that took ours over.
  if (readOwner(folder)?.token === token) {
    rmSync(folder, { force: true, recursive: true })
  }
}

/** Moves a slot that nobody needs any more out of the way. Only one of several runs wins. */
function takeOver(folder, token) {
  try {
    const old = `${folder}.old-${token}`

    renameSync(folder, old)
    rmSync(old, { force: true, recursive: true })
  } catch {
    // Another run was faster.
  }
}

/**
 * Tries to take the slot. Returns the owner entry when it succeeded, and otherwise the entry of
 * the run that holds it (or `undefined` while that run is still writing its entry).
 */
function tryAcquire({ command, folder, token }) {
  const owner = { command, folder: process.cwd(), pid: process.pid, startedAt: Date.now(), token }

  try {
    // mkdir either makes the folder or fails: of runs that try at the same time, one wins.
    mkdirSync(folder)
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error
    }

    return { held: readOwner(folder) }
  }

  writeFileSync(path.join(folder, 'owner.json'), JSON.stringify(owner))

  return { owner }
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

/** Waits for the slot. Resolves with true when this run holds it, false when the wait ends. */
async function acquire({ command, env, folder, token }) {
  const timeout = timeoutOf(env)
  const waitStart = Date.now()
  let lastReminder = 0

  for (;;) {
    const { held, owner } = tryAcquire({ command, folder, token })

    if (owner !== undefined) {
      if (lastReminder > 0) {
        console.error(`Got the slot after ${durationText(Date.now() - waitStart)}.`)
      }

      return true
    }

    const now = Date.now()

    if (held === undefined && now - modifiedAt(folder) > ownerlessMilliseconds) {
      console.error('Taking over a slot that has no owner.')
      takeOver(folder, token)
      continue
    }

    if (held !== undefined && (!isAlive(held.pid) || isExpired({ now, owner: held, timeoutMilliseconds: timeout }))) {
      console.error(
        `Taking over the slot of \`${held.command}\` in ${path.basename(held.folder)}: ${isAlive(held.pid) ? `it has held it for more than ${durationText(timeout)}` : `process ${held.pid} has gone`}.`,
      )
      takeOver(folder, token)
      continue
    }

    if (now - waitStart > timeout) {
      console.error(`Waited more than ${durationText(timeout)} for the slot. Running without it.`)

      return false
    }

    if (held !== undefined && now - lastReminder >= reminderMilliseconds) {
      console.error(waitingMessage({ now, owner: held }))
      lastReminder = now
    }

    await sleep(pollOf(env))
  }
}

async function main(argv) {
  const { run } = parseArguments(argv)
  const env = process.env
  const [command, ...args] = run

  if (isSkipped(env)) {
    return runCommand(command, args)
  }

  const folder = lockFolderOf(env)
  const token = randomUUID()
  const held = await acquire({ command: run.join(' '), env, folder, token })

  try {
    return await runCommand(command, args)
  } finally {
    if (held) {
      release(folder, token)
    }
  }
}

/** Runs the command in the same terminal and passes on a stop; resolves with its exit code. */
function runCommand(command, args) {
  const child = spawn(command, args, { stdio: 'inherit' })
  const pass = (signal) => child.kill(signal)

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => pass(signal))
  }

  return new Promise((resolve) => {
    child.once('error', (error) => {
      console.error(`Could not start ${command}: ${error.message}`)
      resolve(127)
    })
    child.once('exit', (code, signal) => resolve(code ?? (signal === null ? 1 : 128)))
  })
}

if (import.meta.main) {
  try {
    process.exitCode = await main(process.argv.slice(2))
  } catch (error) {
    if (!(error instanceof HeavyLockError)) {
      throw error
    }

    console.error(error.message)
    process.exitCode = error.exitCode
  }
}
