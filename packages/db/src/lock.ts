import type { Pool, RowDataPacket } from 'mysql2/promise'

/** The tasks that take a lock: the migrations when the site starts, and a run of the import. */
export type LockedTask = 'import' | 'migrate'

export type LockOptions = {
  /** How often the connection that holds the lock asks the server something. */
  keepAliveMs?: number
  /** How long to wait for the server when letting go, or for an answer to the keep-alive. */
  releaseTimeoutMs?: number
}

/**
 * The name of the lock for a task. A MariaDB server shares its lock names between all its
 * databases, so the name has the database in it, and databases on one server don't wait for
 * each other. MariaDB allows 64 characters.
 */
export function lockNameFor(url: string, task: LockedTask) {
  return `fansite_${task}_${new URL(url).pathname.slice(1)}`.slice(0, 64)
}

/**
 * Runs `task` while holding a lock in the database (`GET_LOCK`), and lets go when it is done or
 * fails. When another connection keeps the lock for longer than `waitSeconds`, it returns `{
 * ran: false }` without running the task.
 *
 * A lock belongs to the connection that takes it, so that connection stays out of the pool
 * until it lets go. MariaDB also lets go when the connection ends, so a process that dies
 * leaves no lock behind.
 *
 * The connection does nothing while the task runs, and a task can run for a quarter of an hour
 * (#1313). A server or a firewall may drop an idle connection, and a firewall may do it without
 * a word, so that the next query waits for ever. So the connection asks the server something
 * every `keepAliveMs`, which keeps it busy, and letting go gives up after `releaseTimeoutMs`.
 * A connection that did not answer is destroyed instead of returned to the pool, because
 * `pool.end()` waits for every connection, and the process then never ends.
 */
export async function withLock<T>(
  pool: Pool,
  name: string,
  waitSeconds: number,
  task: () => Promise<T>,
  { keepAliveMs = 30_000, releaseTimeoutMs = 10_000 }: LockOptions = {},
): Promise<{ ran: false } | { ran: true; result: T }> {
  const connection = await pool.getConnection()
  let healthy = true
  const answers = async (query: string, values: unknown[] = []) => {
    let timer: NodeJS.Timeout | undefined

    try {
      await Promise.race([
        connection.query(query, values),
        new Promise((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('No answer from the database')), releaseTimeoutMs)
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, ?) AS locked', [name, waitSeconds])

    if (rows[0]?.['locked'] !== 1) {
      return { ran: false }
    }

    const keepAlive = setInterval(() => {
      answers('SELECT 1').catch(() => {
        healthy = false
      })
    }, keepAliveMs)

    try {
      return { ran: true, result: await task() }
    } finally {
      clearInterval(keepAlive)

      // MariaDB lets go of the lock when the connection ends, so a failure here changes
      // nothing.
      await answers('DO RELEASE_LOCK(?)', [name]).catch(() => {
        healthy = false
      })
    }
  } finally {
    if (healthy) {
      connection.release()
    } else {
      connection.destroy()
    }
  }
}
