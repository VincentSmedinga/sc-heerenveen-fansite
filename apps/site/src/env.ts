import { databaseEnvSchema } from '@fansite/db/env'
import { parseEnv } from '@fansite/shared/env'
import * as z from 'zod'

const siteEnvSchema = z.object({
  SITE_ENV: z.enum(['local', 'acceptance', 'production']),
})

const schema = databaseEnvSchema.extend(siteEnvSchema.shape)

// The address of each environment (see the decision Adressen in docs/beslissingen.md). Locally it is `next dev`.
const origins = {
  acceptance: 'https://acc.sc.heerenveen.org',
  local: 'http://localhost:3000',
  production: 'https://sc.heerenveen.org',
} as const

/**
 * Whether search engines may index this environment. Only production may be found. The same build runs on acceptance and
 * later on production, so this reads the environment when the server runs, not when it's built. It reads only SITE_ENV.
 */
export function isIndexable(source: Record<string, string | undefined> = process.env) {
  return parseEnv(siteEnvSchema, source).SITE_ENV === 'production'
}

/**
 * The address of the site in this environment, such as https://sc.heerenveen.org, for what needs full addresses, such as a
 * feed. Like isIndexable, it reads SITE_ENV when the server runs, and only that.
 */
export function originOf(source: Record<string, string | undefined> = process.env) {
  return origins[parseEnv(siteEnvSchema, source).SITE_ENV]
}

/**
 * Reads the environment variables of the site and checks them. `instrumentation.ts` calls it when the server starts, so
 * a missing or invalid variable stops the site with one clear message.
 */
export function readEnv(source: Record<string, string | undefined> = process.env) {
  return parseEnv(schema, source)
}
