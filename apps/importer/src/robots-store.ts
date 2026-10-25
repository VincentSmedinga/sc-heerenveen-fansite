import type { Database } from '@fansite/db/client'

import { robotsTxt } from '@fansite/db/schema'
import { and, eq, gt } from 'drizzle-orm'

import type { RobotsStore } from './fetcher.ts'
import type { RobotsRule } from './robots.ts'

/** How long we keep the rules of a robots.txt: RFC 9309 allows a crawler 24 hours. */
export const robotsMaxAgeMs = 24 * 60 * 60 * 1000

/**
 * Keeps the rules of robots.txt in the database, in the table `robots_txt`, so the next runs
 * need not ask the host again for a day. The database is the only place that stays between
 * runs: a deploy replaces the folder of the app. `clock` gives the time, which a test can set.
 */
export function robotsStoreFor(db: Database, clock: () => Date = () => new Date()): RobotsStore {
  return {
    async get(origin) {
      const [row] = await db
        .select({ rules: robotsTxt.rules })
        .from(robotsTxt)
        .where(and(eq(robotsTxt.origin, origin), gt(robotsTxt.fetchedAt, new Date(clock().getTime() - robotsMaxAgeMs))))

      return row === undefined ? undefined : parseRules(row.rules)
    },

    async set(origin, rules) {
      const kept = { fetchedAt: clock(), rules: JSON.stringify(rules) }

      await db
        .insert(robotsTxt)
        .values({ origin, ...kept })
        .onDuplicateKeyUpdate({ set: kept })
    },
  }
}

/**
 * Reads the rules back from JSON, or gives undefined when they are not what we wrote, so the
 * fetcher reads them again.
 */
function parseRules(json: string): RobotsRule[] | undefined {
  try {
    const rules: unknown = JSON.parse(json)

    return Array.isArray(rules) &&
      rules.every(
        (rule: unknown) =>
          typeof rule === 'object' &&
          rule !== null &&
          'allow' in rule &&
          typeof rule.allow === 'boolean' &&
          'pattern' in rule &&
          typeof rule.pattern === 'string',
      )
      ? (rules as RobotsRule[])
      : undefined
  } catch {
    return undefined
  }
}
