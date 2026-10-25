import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { adminSessions, adminUsers, feeds, items, sources } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'
import path from 'node:path'

import { hashOf, newToken } from '../src/beheer/sessions'

// A moderator with a session for the checks of the admin. The login of the admin is a link in a mail, which a browser test
// can't follow without a mailbox, so the check puts the account and the session in the database itself, as `startSession`
// does, and gives the browser the cookie. Nothing in the site can do this: there is no route, no environment variable and no
// token in the code that logs in, and this file is not part of the build. The token is made anew for every run, it is only in
// the memory of the check (and in the environment of its workers), and the account and the session are removed afterwards.

/** The account of the check. `.test` is a domain that can't exist, so a mail to it goes nowhere. */
export const adminEmail = 'e2e-moderator@example.test'

/** The name of the cookie of the admin (`sessionCookieName` in src/beheer/require-role.ts, which the build of Next.js owns). */
export const sessionCookieName = 'beheer-sessie'

/** The environment variable that hands the token of the session from the setup to the tests, which run in other processes. */
const tokenVariable = 'E2E_ADMIN_TOKEN'

/**
 * The made-up items the tests of the admin hide and show, on the source of the seed that is switched off, so the
 * homepage and /podcasts never show them and a test that hides one can't change what another test reads there.
 */
export const adminItems = {
  withoutScript: 'Verzonnen bericht om te verbergen zonder JavaScript',
  withScript: 'Verzonnen bericht om te verbergen met JavaScript',
} as const

const sourceDomain = 'uitgezet.test'

/** The feeds of the made-up items: easy to recognise, so one that outlasts a run is easy to remove. */
const feedPath = '/e2e-admin/rss/'

const loopback = new Set(['127.0.0.1', '::1', '[::1]', 'localhost'])

/**
 * Puts the moderator, its session and the made-up items in the database and returns the function that takes them out
 * again. It only works on a database on this computer: it refuses any other host, so it can never write to the database of
 * acceptance or production, whatever `DATABASE_URL` says by mistake. The site must have started already: it makes the
 * tables and puts the test sources in (SITE_ENV=acceptance).
 */
export async function addAdmin() {
  const { DATABASE_URL } = databaseEnv()
  const { hostname } = new URL(DATABASE_URL)

  if (!loopback.has(hostname)) {
    throw new Error(
      `The checks of the admin only write to a database on this computer, and DATABASE_URL names ${hostname}. ` +
        'They put an account with a session in it, which must never reach acceptance or production.',
    )
  }

  const { close, db, pool } = connect(DATABASE_URL)

  try {
    // A run that was stopped halfway may have left its account and items.
    await remove(pool)

    const [user] = await db.insert(adminUsers).values({ email: adminEmail, role: 'moderator' }).$returningId()
    const token = newToken()
    const now = new Date()

    await db
      .insert(adminSessions)
      .values({ createdAt: now, lastSeenAt: now, tokenHash: hashOf(token), userId: user?.id ?? 0 })
    process.env[tokenVariable] = token

    const [source] = await db.select({ id: sources.id }).from(sources).where(eq(sources.domain, sourceDomain))

    if (source === undefined) {
      throw new Error(
        `The test source ${sourceDomain} is not in the register. Did the site start with SITE_ENV=acceptance?`,
      )
    }

    const [feed] = await db
      .insert(feeds)
      .values({ sourceId: source.id, url: `https://${sourceDomain}${feedPath}` })
      .$returningId()

    await db.insert(items).values(
      Object.values(adminItems).map((title, index) => ({
        feedId: feed?.id ?? 0,
        key: `e2e-admin-${index}`,
        // The newest items of all, so the list shows them first.
        publishedAt: new Date(now.getTime() - index * 60 * 1000),
        sourceId: source.id,
        title,
        url: `https://${sourceDomain}/e2e-admin-${index}`,
      })),
    )
  } finally {
    await close()
  }

  return async () => {
    const { close, pool } = connect(DATABASE_URL)

    try {
      delete process.env[tokenVariable]
      await remove(pool)
    } finally {
      await close()
    }
  }
}

/**
 * The cookie that logs the browser in as the moderator of the check. It has the attributes the site sets, and `Secure`
 * works on 127.0.0.1 in Chromium.
 */
export function adminCookie(host: string) {
  const value = process.env[tokenVariable]

  if (value === undefined) {
    throw new Error(`${tokenVariable} is not set: the global setup of the checks makes the session.`)
  }

  return {
    domain: host,
    httpOnly: true,
    name: sessionCookieName,
    path: '/beheer',
    sameSite: 'Lax' as const,
    secure: true,
    value,
  }
}

/** Connects with the DATABASE_URL of the environment or the .env in the root, like the server of the check does. */
function databaseEnv() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return readDatabaseEnv()
}

/**
 * Takes the made-up feeds out, and with them their items, then the account with its sessions. The log of the admin has
 * rows of the account when a test has hidden an item, and the rows refuse to go with the account, so they go first. That is
 * for this database on this computer only (see `addAdmin`): the site has no way to remove a row of the log.
 */
async function remove(pool: ReturnType<typeof connect>['pool']) {
  await pool.query('DELETE FROM feeds WHERE url LIKE ?', [`https://%${feedPath}`])
  await pool.query('DELETE FROM audit_log WHERE user_id IN (SELECT id FROM admin_users WHERE email = ?)', [adminEmail])
  await pool.query('DELETE FROM admin_users WHERE email = ?', [adminEmail])
}
