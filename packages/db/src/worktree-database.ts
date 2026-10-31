import { connect } from './client.ts'
import { readDatabaseEnv } from './env.ts'
import { migrateDatabase } from './migrate.ts'
import { seedMatches, seedSources, seedSquad } from './seed.ts'
import { seedStaff } from './staff-seed.ts'
import { connectToServer } from './test-database.ts'

export async function dropWorktreeDatabase(url: string) {
  const name = worktreeDatabaseName(url)
  const server = await connectToServer(url)

  try {
    await server.query('DROP DATABASE IF EXISTS ??', [name])
  } finally {
    await server.end()
  }

  return name
}

/**
 * The database of a worktree: `fansite_<name of the worktree>` on the server in `DATABASE_URL`,
 * which scripts/worktree-env.js puts there. `ensure` makes it when it isn't there yet, runs the
 * migrations and puts the seed in it, as CI does for its database; `drop` removes it. Only a
 * name that starts with `fansite_` is touched, so `fansite`, with the real import, stays.
 *
 * `pnpm worktree:db:drop` runs the second.
 */
export async function ensureWorktreeDatabase(url: string) {
  const name = worktreeDatabaseName(url)
  const server = await connectToServer(url)

  try {
    await server.query('CREATE DATABASE IF NOT EXISTS ??', [name])
  } finally {
    await server.end()
  }

  const { close, db } = connect(url)

  try {
    await migrateDatabase(db)
    await seedSources(db)
    await seedMatches(db)
    await seedSquad(db)
    await seedStaff(db)
  } finally {
    await close()
  }
}

/** The name of the database in `url`, or an error when it isn't one of a worktree. */
export function worktreeDatabaseName(url: string) {
  const name = new URL(url).pathname.slice(1)

  if (!/^fansite_[a-z0-9_]+$/.test(name)) {
    throw new Error(
      `The database "${name}" is not the database of a worktree (fansite_<name>), so this command leaves it alone.`,
    )
  }

  return name
}

if (import.meta.main) {
  const [action] = process.argv.slice(2)
  const { DATABASE_URL } = readDatabaseEnv()

  if (action === 'ensure') {
    await ensureWorktreeDatabase(DATABASE_URL)
    console.log(`The database ${worktreeDatabaseName(DATABASE_URL)} is ready.`)
  } else if (action === 'drop') {
    console.log(`Dropped the database ${await dropWorktreeDatabase(DATABASE_URL)}.`)
  } else {
    console.error('Usage: node worktree-database.ts ensure|drop')
    process.exit(2)
  }
}
