import { connect } from '@fansite/db/client'
import { withClubs } from '@fansite/db/clubs'
import { readDatabaseEnv } from '@fansite/db/env'
import {
  adminSessions,
  adminUsers,
  clubs,
  feeds,
  items,
  matchAppearances,
  matches,
  matchReports,
  players,
  predictions,
  sources,
  staff,
  supporters,
} from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, eq, inArray } from 'drizzle-orm'
import path from 'node:path'

import { hashOf, newToken } from '../src/beheer/sessions'

// An owner, an editor and an author with a session for the checks of the admin (issue 1156).
// The login of the admin is a link in a mail, which a browser test can't follow without a
// mailbox, so the check puts the account and the session in the database itself, as
// `startSession` does, and gives the browser the cookie. Nothing in the site can do this: there
// is no route, no environment variable and no token in the code that logs in, and this file is
// not part of the build. The tokens are made anew for every run, they are only in the memory of
// the check (and in the environment of its workers), and the accounts and the sessions are
// removed afterwards. The editor hides messages and writes articles; the owner also manages the
// accounts; the author only writes his own articles.

/**
 * The accounts of the check, by role. `.test` is a domain that can't exist, so a mail to it
 * goes nowhere.
 */
const accounts = {
  author: { email: 'e2e-auteur@example.test', firstName: 'Auteur', variable: 'E2E_AUTHOR_TOKEN' },
  editor: { email: 'e2e-redacteur@example.test', firstName: 'Redacteur', variable: 'E2E_EDITOR_TOKEN' },
  owner: { email: 'e2e-eigenaar@example.test', firstName: 'Eigenaar', variable: 'E2E_OWNER_TOKEN' },
} as const

export type E2eRole = keyof typeof accounts

/**
 * The name of the cookie of the admin (`sessionCookieName` in src/beheer/require-role.ts, which
 * the build of Next.js owns).
 */
export const sessionCookieName = 'beheer-sessie'

/**
 * The made-up items the tests of the admin hide and show, on the source of the seed that is
 * switched off, so the homepage and /nieuws/podcasts never show them and a test that hides
 * one can't change what another test reads there.
 */
export const adminItems = {
  // The importer judged this one `doubtful`: `relevance.spec.ts` puts it on the site and takes
  // it back.
  approving: 'Bedacht twijfelgeval om op de site te zetten',
  withoutScript: 'Verzonnen bericht om te verbergen zonder JavaScript',
  withScript: 'Verzonnen bericht om te verbergen met JavaScript',
} as const

const sourceDomain = 'uitgezet.test'

/**
 * The feeds of the made-up items: easy to recognise, so one that outlasts a run is easy to
 * remove.
 */
const feedPath = '/e2e-admin/rss/'

const loopback = new Set(['127.0.0.1', '::1', '[::1]', 'localhost'])

/**
 * Puts the owner, the editor, the author, their sessions and the made-up items in the database
 * and returns the function that takes them out again. It only works on a database on this
 * computer: it refuses any other host, so it can never write to the database of acceptance or
 * production, whatever `DATABASE_URL` says by mistake. The site must have started already: it
 * makes the tables, and global-setup.ts puts the test sources in (see test-sources.ts).
 */
export async function addAdmin() {
  const DATABASE_URL = localDatabaseUrl()

  const { close, db, pool } = connect(DATABASE_URL)

  try {
    // A run that was stopped halfway may have left its account and items.
    await remove(pool)

    const now = new Date()

    for (const [role, { email, firstName, variable }] of Object.entries(accounts)) {
      const [user] = await db
        .insert(adminUsers)
        .values({ email, firstName, role: role as E2eRole })
        .$returningId()
      const token = newToken()

      await db
        .insert(adminSessions)
        .values({ createdAt: now, lastSeenAt: now, tokenHash: hashOf(token), userId: user?.id ?? 0 })
      process.env[variable] = token
    }

    const [source] = await db.select({ id: sources.id }).from(sources).where(eq(sources.domain, sourceDomain))

    if (source === undefined) {
      throw new Error(
        `The test source ${sourceDomain} is not in the register. Did global-setup.ts put the test sources in (test-sources.ts)?`,
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
        relevance: title === adminItems.approving ? ('doubtful' as const) : ('relevant' as const),
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
      for (const { variable } of Object.values(accounts)) {
        delete process.env[variable]
      }

      await remove(pool)
    } finally {
      await close()
    }
  }
}

/**
 * A session of its own for an account of the check, as the cookie for the
 * browser. The session of the global setup is shared by every test, so a test that logs out or
 * revokes uses this one: it goes with the account when the check is over (the sessions of an
 * account are removed with it).
 */
export async function addAdminSession(host: string, role: E2eRole = 'editor') {
  const { close, db } = connect(localDatabaseUrl())

  try {
    const [user] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, accounts[role].email))

    if (user === undefined) {
      throw new Error(`The account of the ${role} is not there: the global setup of the checks makes it.`)
    }

    const token = newToken()
    const now = new Date()

    await db
      .insert(adminSessions)
      .values({ createdAt: now, lastSeenAt: now, tokenHash: hashOf(token), userId: user.id })

    return { ...adminCookie(host, role), value: token }
  } finally {
    await close()
  }
}

/**
 * A match that was played, with the prediction of the supporter with this address, for the
 * checks of the points (issue 1449). The editors enter a result in the admin, which has its own
 * checks, so this puts the result in the database as the admin does. The match is in a season
 * of its own and goes again with `removePlayedPrediction`. It returns the number of the match.
 */
export async function addPlayedPrediction(email: string, round: string) {
  const { close, db } = connect(localDatabaseUrl())

  try {
    const [supporter] = await db.select({ id: supporters.id }).from(supporters).where(eq(supporters.email, email))
    const [club] = await db.select({ id: clubs.id }).from(clubs).limit(1)

    if (supporter === undefined || club === undefined) {
      throw new Error('The supporter or a club is not there.')
    }

    const [match] = await db.insert(matches).values({
      clubId: club.id,
      competition: 'Eredivisie',
      goalsAgainst: 1,
      goalsFor: 2,
      halfTimeAgainst: 0,
      halfTimeFor: 1,
      halfTimeSource: 'redactie',
      home: true,
      kickoffAt: new Date('1999-11-14T19:45:00Z'),
      matchDate: '1999-11-14',
      opponent: 'Puntenploeg',
      round,
      season: '1999/00',
      status: 'played',
    })

    await db.insert(predictions).values({
      fullTimeAway: 1,
      fullTimeHome: 3,
      halftimeAway: 1,
      halftimeHome: 1,
      matchId: match.insertId,
      supporterId: supporter.id,
    })

    return match.insertId
  } finally {
    await close()
  }
}

/** The three made-up players of the match of `addRatingMatch`, in the order of the page. */
export const ratingPlayers = ['Cijfer Aanvaller', 'Cijfer Keeper', 'Cijfer Verdediger'] as const

/** The head coach of the seed of acceptance, who holds the day of these matches (#1478). */
export const ratingCoach = 'Robin Veldman'

/** A made-up second coach: with two on the same day the match has no coach (issue 1478). */
const otherCoach = 'Cijfer Interim'

/**
 * A match that was played ten minutes ago, with a finished report of three players of ours who
 * played 90 minutes, for the checks of the game Uitblinker (issue 1470). It is the last match
 * played and the one after it (the made-up match in three days) is far enough away to keep the
 * window open. The account with this address is made older than the match, because the
 * browser makes it a moment ago and only an account that was there before the match can rate.
 * The seed of acceptance, which the checks run with, has a head coach for today, so the form
 * has a group for him (issue 1478). Without `coach`, a second coach of the same day is added,
 * so the match has none and the form has players only. It returns what takes the match away
 * again.
 */
export async function addRatingMatch(email: string, { coach = false }: { coach?: boolean } = {}) {
  const { close, db } = connect(localDatabaseUrl())

  try {
    const kickoffAt = new Date(Math.floor(Date.now() / 1000) * 1000 - 10 * 60 * 1000)
    const season = seasonOf(kickoffAt)

    // What a check that stopped halfway left behind, so a second run starts clean.
    await db.delete(matches).where(and(eq(matches.opponent, 'Cijferploeg'), eq(matches.round, 'Cijfer-controle')))
    await db.delete(players).where(inArray(players.name, [...ratingPlayers]))
    await db.delete(staff).where(eq(staff.name, otherCoach))

    if (!coach) {
      await db
        .insert(staff)
        .values({ interim: true, name: otherCoach, role: 'coach', startDate: '2000-01-01', startPrecision: 'day' })
    }

    await db
      .update(supporters)
      .set({ createdAt: new Date(kickoffAt.getTime() - 30 * 24 * 60 * 60 * 1000) })
      .where(eq(supporters.email, email))

    // The opponent is a club of its own, so no other check sees one more match against a club.
    const [row] = await withClubs(db, [
      {
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 1,
        home: true,
        kickoffAt,
        matchDate: kickoffAt.toISOString().slice(0, 10),
        opponent: 'Cijferploeg',
        round: 'Cijfer-controle',
        season,
        status: 'played',
      },
    ])
    const [match] = await db.insert(matches).values(row!)

    const matchId = match.insertId

    await db.insert(matchReports).values({ matchId, opponentComplete: false, status: 'klaar' })

    for (const [index, name] of ratingPlayers.entries()) {
      const [player] = await db.insert(players).values({ name, searchTerm: name, season, source: 'selectie' })

      await db
        .insert(matchAppearances)
        .values({ matchId, name, ours: true, playerId: player.insertId, shirtNumber: index + 1, starter: true })
    }

    return async () => {
      const connection = connect(localDatabaseUrl())

      try {
        // The report, its players and their grades go with the match.
        await connection.db.delete(matches).where(eq(matches.id, matchId))
        await connection.db.delete(players).where(inArray(players.name, [...ratingPlayers]))
        await connection.db.delete(staff).where(eq(staff.name, otherCoach))
        await connection.db.delete(clubs).where(eq(clubs.id, row?.clubId ?? 0))
      } finally {
        await connection.close()
      }
    }
  } finally {
    await close()
  }
}

/** The number of the account of the check with this role, for the address of its form. */
export async function adminAccountId(role: E2eRole) {
  const { close, db } = connect(localDatabaseUrl())

  try {
    const [user] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, accounts[role].email))

    if (user === undefined) {
      throw new Error(`The account of the ${role} is not there: the global setup of the checks makes it.`)
    }

    return user.id
  } finally {
    await close()
  }
}

/**
 * The cookie that logs the browser in as the editor of the check, or as the owner or the author
 * when the role says so. It has the attributes the site sets, and `Secure` works on 127.0.0.1
 * in Chromium.
 */
export function adminCookie(host: string, role: E2eRole = 'editor') {
  const value = process.env[accounts[role].variable]

  if (value === undefined) {
    throw new Error(`${accounts[role].variable} is not set: the global setup of the checks makes the session.`)
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

/** The editors correct a result: the goals of sc Heerenveen and of the opponent. */
export async function correctPlayedResult(matchId: number, goalsFor: number, goalsAgainst: number) {
  const { close, db } = connect(localDatabaseUrl())

  try {
    await db.update(matches).set({ goalsAgainst, goalsFor }).where(eq(matches.id, matchId))
  } finally {
    await close()
  }
}

/**
 * The number of a made-up supporter, which it adds when it isn't there, for the address of the
 * page of one account of the supporters in the admin (issue 1458). Two workers may add it at
 * once: the second finds it after the database refuses the duplicate.
 */
export async function madeUpSupporterId() {
  const { close, db } = connect(localDatabaseUrl())
  const find = () =>
    db.select({ id: supporters.id }).from(supporters).where(eq(supporters.email, 'proefaccount@example.test'))

  try {
    const [existing] = await find()

    if (existing !== undefined) {
      return existing.id
    }

    try {
      const [inserted] = await db.insert(supporters).values({
        email: 'proefaccount@example.test',
        screenName: 'Proefaccount',
        screenNameKey: 'proefaccount',
      })

      return inserted.insertId
    } catch {
      const [found] = await find()

      if (found === undefined) {
        throw new Error('The made-up supporter could not be added.')
      }

      return found.id
    }
  } finally {
    await close()
  }
}

/** Takes the match of `addPlayedPrediction` away, with its predictions. */
export async function removePlayedPrediction(matchId: number) {
  const { close, db } = connect(localDatabaseUrl())

  try {
    await db.delete(matches).where(eq(matches.id, matchId))
  } finally {
    await close()
  }
}

/**
 * Connects with the DATABASE_URL of the environment or the .env in the root, like the server of
 * the check does.
 */
function databaseEnv() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return readDatabaseEnv()
}

/**
 * The DATABASE_URL of the check, if it names a database on this computer, and otherwise an
 * error: whatever it says by mistake, the checks never write to the database of acceptance or
 * production.
 */
function localDatabaseUrl() {
  const { DATABASE_URL } = databaseEnv()
  const { hostname } = new URL(DATABASE_URL)

  if (!loopback.has(hostname)) {
    throw new Error(
      `The checks of the admin only write to a database on this computer, and DATABASE_URL names ${hostname}. ` +
        'They put an account with a session in it, which must never reach acceptance or production.',
    )
  }

  return DATABASE_URL
}

/**
 * Takes the made-up feeds out, and with them their items, then the articles that a test wrote,
 * then the accounts with their sessions. The log of the admin has rows of the accounts when a
 * test has hidden an item or written an article, and the rows refuse to go with the account,
 * so they go first, and the articles too, which belong to the account that wrote them, after
 * their versions. That is for this database on this computer only (see `addAdmin`): the site
 * has no way to remove a row of the log, an article or a version.
 */
async function remove(pool: ReturnType<typeof connect>['pool']) {
  const emails = Object.values(accounts).map(({ email }) => email)
  const users = 'SELECT id FROM admin_users WHERE email IN (?)'

  await pool.query('DELETE FROM feeds WHERE url LIKE ?', [`https://%${feedPath}`])
  await pool.query(
    `DELETE FROM article_versions WHERE article_id IN (SELECT id FROM articles WHERE created_by IN (${users})) OR saved_by IN (${users})`,
    [emails, emails],
  )
  await pool.query(`DELETE FROM articles WHERE created_by IN (${users}) OR updated_by IN (${users})`, [emails, emails])
  await pool.query(`DELETE FROM audit_log WHERE user_id IN (${users})`, [emails])
  await pool.query('DELETE FROM admin_users WHERE email IN (?)', [emails])
}
