import { parseEnv } from '@fansite/shared/env'
import * as z from 'zod'

/** The variables the database needs. An app that connects adds these to its own schema for `parseEnv`. */
export const databaseEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^mysql$/ }),
})

/** Reads the variables for the database and checks them, so a missing or invalid `DATABASE_URL` stops with one message. */
export function readDatabaseEnv(source: Record<string, string | undefined> = process.env) {
  return parseEnv(databaseEnvSchema, source)
}
