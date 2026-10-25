import type { Pool, RowDataPacket } from 'mysql2/promise'

/** The tasks that take a lock: the migrations when the site starts, and a run of the import. */
export type LockedTask = 'import' | 'migrate'

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
 */
export async function withLock<T>(
  pool: Pool,
  name: string,
  waitSeconds: number,
  task: () => Promise<T>,
): Promise<{ ran: false } | { ran: true; result: T }> {
  const connection = await pool.getConnection()

  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, ?) AS locked', [name, waitSeconds])

    if (rows[0]?.['locked'] !== 1) {
      return { ran: false }
    }

    try {
      return { ran: true, result: await task() }
    } finally {
      // MariaDB lets go of the lock when the connection ends, so a failure here changes
      // nothing.
      await connection.query('DO RELEASE_LOCK(?)', [name]).catch(() => undefined)
    }
  } finally {
    connection.release()
  }
}
