import { parseEnv } from '@fansite/shared/env'
import * as z from 'zod'

const schema = z.object({
  SITE_ENV: z.enum(['local', 'acceptance', 'production']),
})

/**
 * Whether search engines may index this environment. Only production may be found. The same build runs on acceptance and
 * later on production, so this reads the environment when the server runs, not when it's built.
 */
export function isIndexable(source: Record<string, string | undefined> = process.env) {
  return readEnv(source).SITE_ENV === 'production'
}

/**
 * Reads the environment variables of the site and checks them. `instrumentation.ts` calls it when the server starts, so
 * a missing or invalid variable stops the site with one clear message.
 */
export function readEnv(source: Record<string, string | undefined> = process.env) {
  return parseEnv(schema, source)
}
