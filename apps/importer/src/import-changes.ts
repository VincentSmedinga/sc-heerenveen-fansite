// The command that lets a person decide the changes of a match that wait,
// `pnpm run import:changes`, and on the host `import.mjs --changes`. Without an argument it
// lists them. `accept` and `reject`, with numbers or `all`, decide them (see
// `match-changes.ts`). It never asks Wikipedia.
import type { MatchChange } from '@fansite/db/schema'

import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'

import type { ImportOptions } from './import-feeds.ts'

import { reliability } from './classify-change.ts'
import { acceptChanges, rejectChanges, waitingChanges } from './match-changes.ts'
import { formatTime, printable } from './text.ts'

/** What the command says when it gets arguments it does not know. */
export const changesUsage =
  'Usage: pnpm run import:changes, to list the changes that wait; pnpm run import:changes accept <number>... or all; pnpm run import:changes reject <number>... or all'

export type ChangesRequest =
  | { action: 'accept' | 'reject'; ids: 'all' | number[]; kind: 'decide' }
  | { kind: 'list' }
  | { kind: 'refused'; message: string }

/** The lines that show a change that waits: the two values and when it is taken over. */
export function describeWaitingChange(change: MatchChange): string[] {
  const takenOver = new Date(change.firstSeenAt.getTime() + reliability.suspiciousStands)

  return [
    `${nameChange(change)}: ${printable(change.reason)}`,
    `  now: ${printable(change.oldValue)}`,
    `  Wikipedia: ${change.newValue === null ? 'the match is not on the page' : printable(change.newValue)}`,
    `  first seen ${formatTime(change.firstSeenAt)}, last seen ${formatTime(change.lastSeenAt)}, seen ${change.timesSeen} ${change.timesSeen === 1 ? 'time' : 'times'}; taken over from ${formatTime(takenOver)} if it stays`,
  ]
}

/** One line to name a change: its number, its match and what changed. */
export function nameChange(change: MatchChange): string {
  return `#${change.id} ${printable(change.round)} (${change.competition} ${change.season})`
}

/** Reads the arguments: nothing, or `accept`/`reject` with the numbers of changes or `all`. */
export function parseChangesArguments(args: string[]): ChangesRequest {
  const refuse = (message: string) => ({ kind: 'refused', message: `${message}\n${changesUsage}` }) as const

  if (args.length === 0) {
    return { kind: 'list' }
  }

  const [action, ...rest] = args

  if (action !== 'accept' && action !== 'reject') {
    return refuse(`'${printable(action ?? '').slice(0, 40)}' is not accept or reject.`)
  }
  if (rest.length === 0) {
    return refuse(`No change given to ${action}.`)
  }
  if (rest.length === 1 && rest[0] === 'all') {
    return { action, ids: 'all', kind: 'decide' }
  }
  if (!rest.every((id) => /^\d{1,9}$/u.test(id))) {
    return refuse('A change is a number, as the list shows it, or all.')
  }

  return { action, ids: rest.map(Number), kind: 'decide' }
}

/**
 * Lists the changes that wait, or accepts or rejects them. Deciding takes the lock of the
 * import, so it never runs beside a run of cron; when a run holds it, nothing happens and the
 * command says so.
 *
 * Returns the exit code: 0 when the list is shown or every change asked for is decided, and 1
 * for arguments it refuses, a change that does not wait, and a run that holds the lock.
 */
export async function runChangesCommand(
  databaseUrl: string,
  args: string[],
  { clock = () => new Date(), write = console.log }: Pick<ImportOptions, 'clock' | 'write'> = {},
): Promise<number> {
  const request = parseChangesArguments(args)

  if (request.kind === 'refused') {
    write(request.message)

    return 1
  }

  const { close, db, pool } = connect(databaseUrl)

  try {
    if (request.kind === 'list') {
      const waiting = await waitingChanges(db)

      write(waiting.length === 0 ? 'No changes wait.' : `Changes that wait: ${waiting.length}`)
      for (const change of waiting) {
        for (const line of describeWaitingChange(change)) {
          write(line)
        }
      }

      return 0
    }

    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, async () => {
      const decide = request.action === 'accept' ? acceptChanges : rejectChanges

      return decide(db, request.ids, clock())
    })

    if (!run.ran) {
      write('An import is still running on this database, so this command does nothing. Try again in a few minutes.')

      return 1
    }

    const decided = new Set(run.result.map((decision) => decision.change.id))

    for (const decision of run.result) {
      write(`${nameChange(decision.change)}: ${decision.message}`)
    }
    if (request.ids === 'all') {
      if (run.result.length === 0) {
        write('No changes wait.')
      }

      return run.result.every((decision) => decision.ok) ? 0 : 1
    }

    const missing = request.ids.filter((id) => !decided.has(id))

    for (const id of missing) {
      write(`#${id}: no change with this number waits`)
    }

    return missing.length === 0 && run.result.every((decision) => decision.ok) ? 0 : 1
  } finally {
    await close()
  }
}
