import type { Database } from '@fansite/db/client'

import { dailyVisitors, pageViews, type SkipReason, skipReasons, visitExclusions } from '@fansite/db/schema'
import { visitDay } from '@fansite/db/visits'
import { desc, gte, sql } from 'drizzle-orm'

// The numbers of the visit for the admin: the counters that the site keeps per day (see
// `createVisitCounter` in @fansite/db/visits), read for the last days. The counters hold no
// person, so there is nothing to hide here: the page that shows them is for editors only
// because the numbers are for the team.

/** How many days the page shows, today included. */
export const days = 30

/** How many days the short total counts, today included. */
export const shortDays = 7

/** How many of the most viewed pages the page lists. */
export const topLength = 20

/** How many requests of the last 7 and 30 days were not counted, for one reason. */
export type SkippedRequests = { reason: SkipReason; total: number; totalShort: number }

/** The most viewed page of the period, with its views. */
export type ViewedPage = { path: string; views: number }

/** One day: how many different visitors it had and how many pages were viewed. */
export type VisitDay = { day: string; views: number; visitors: number }

/** What the page shows. */
export type VisitNumbers = {
  /** The last `days` days, newest first, a day without a counter as zero. */
  perDay: VisitDay[]
  /** The requests that were not counted, one row per reason, always all of them. */
  skipped: SkippedRequests[]
  /** The most viewed pages of those days, most views first. */
  topPages: ViewedPage[]
  /** The sum of the last 30 days. */
  total: Totals
  /** The sum of the last 7 days. */
  totalShort: Totals
}

type Totals = { views: number; visitors: number }

/** The days up to and including today, newest first, as `2026-10-26`. */
export function lastDays(now: Date, count: number) {
  const [year = 0, month = 1, day = 1] = visitDay(now).split('-').map(Number)

  return Array.from({ length: count }, (_, back) =>
    new Date(Date.UTC(year, month - 1, day - back)).toISOString().slice(0, 10),
  )
}

/**
 * The numbers of the last 30 days as of `now`. A visitor counts once a day, so a total of
 * visitors is the sum of the days: somebody who comes on two days is in it twice. A day
 * is a day in the Netherlands, as `visitDay` says.
 */
export async function visitNumbers(db: Pick<Database, 'select'>, now: Date = new Date()): Promise<VisitNumbers> {
  const list = lastDays(now, days)
  const first = list.at(-1) ?? visitDay(now)

  const views = await db
    .select({ day: pageViews.day, views: sql<number>`sum(${pageViews.views})`.mapWith(Number) })
    .from(pageViews)
    .where(gte(pageViews.day, first))
    .groupBy(pageViews.day)
  const visitors = await db
    .select({ day: dailyVisitors.day, visitors: dailyVisitors.visitors })
    .from(dailyVisitors)
    .where(gte(dailyVisitors.day, first))
  const top = await db
    .select({ path: pageViews.path, views: sql<number>`sum(${pageViews.views})`.mapWith(Number) })
    .from(pageViews)
    .where(gte(pageViews.day, first))
    .groupBy(pageViews.path)
    .orderBy(desc(sql`sum(${pageViews.views})`), pageViews.path)
    .limit(topLength)

  const skippedRows = await db
    .select({ day: visitExclusions.day, reason: visitExclusions.reason, requests: visitExclusions.requests })
    .from(visitExclusions)
    .where(gte(visitExclusions.day, first))

  const shortFirst = list[shortDays - 1] ?? first
  const skipped = skipReasons.map((reason) => {
    const own = skippedRows.filter((row) => row.reason === reason)

    return {
      reason,
      total: own.reduce((sum, row) => sum + row.requests, 0),
      totalShort: own.filter((row) => row.day >= shortFirst).reduce((sum, row) => sum + row.requests, 0),
    }
  })

  const viewsOf = new Map(views.map((row) => [row.day, row.views]))
  const visitorsOf = new Map(visitors.map((row) => [row.day, row.visitors]))
  const perDay = list.map((day) => ({ day, views: viewsOf.get(day) ?? 0, visitors: visitorsOf.get(day) ?? 0 }))

  return {
    perDay,
    skipped,
    topPages: top,
    total: sumOf(perDay),
    totalShort: sumOf(perDay.slice(0, shortDays)),
  }
}

function sumOf(rows: readonly VisitDay[]): Totals {
  return {
    views: rows.reduce((sum, row) => sum + row.views, 0),
    visitors: rows.reduce((sum, row) => sum + row.visitors, 0),
  }
}
