import { databaseEnvSchema } from '@fansite/db/env'
import { parseEnv } from '@fansite/shared/env'
import * as z from 'zod'

import { mailEnvSchema, requireSmtpOutsideLocal } from './mail-env'

const siteEnvSchema = z.object({
  SITE_ENV: z.enum(['local', 'acceptance', 'production']),
})

const schema = databaseEnvSchema
  .extend(siteEnvSchema.shape)
  .extend(mailEnvSchema.shape)
  .superRefine(requireSmtpOutsideLocal)

// What sendMail needs: the settings of the mail server, and SITE_ENV to know whether they may
// be missing. It doesn't need the database, so the command that sends a test mail on the host
// runs without DATABASE_URL.
const mailSchema = siteEnvSchema.extend(mailEnvSchema.shape).superRefine(requireSmtpOutsideLocal)

// Set by `pnpm review` (see scripts/review.js), and nowhere else. Optional, and not part of the
// schema above: only the dev server reads it, and the site must start without it.
const reviewEnvSchema = z.object({
  REVIEW_BRANCH: z
    .string()
    .regex(/^[\w./-]+$/, 'must be the name of a branch')
    .optional(),
})

// The address of each environment (see the decision Adressen in docs/beslissingen.md). Locally
// it is `next dev`.
const origins = {
  acceptance: 'https://acc.sc.heerenveen.org',
  local: 'http://localhost:3000',
  production: 'https://sc.heerenveen.org',
} as const

/**
 * Whether search engines may index this environment. Only production may be found. The same
 * build runs on acceptance and later on production, so this reads the environment when the
 * server runs, not when it's built. It reads only SITE_ENV.
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
 * Reads the environment variables of the site and checks them. `instrumentation.ts` calls it
 * when the server starts, so a missing or invalid variable stops the site with one clear
 * message.
 */
export function readEnv(source: Record<string, string | undefined> = process.env) {
  return parseEnv(schema, source)
}

/**
 * Reads the settings for sending mail (see sendMail) and checks them. Like isIndexable, it
 * reads them when the server runs, and only them and SITE_ENV.
 */
export function readMailEnv(source: Record<string, string | undefined> = process.env) {
  return parseEnv(mailSchema, source)
}

/**
 * The name of the branch that `pnpm review` is showing, for the title of the tab. Only `next
 * dev` has one: a build, and so acceptance and production, never shows a branch, whatever
 * REVIEW_BRANCH holds. It reads only that variable and NODE_ENV.
 */
export function reviewBranch(source: Record<string, string | undefined> = process.env) {
  return source['NODE_ENV'] === 'development' ? parseEnv(reviewEnvSchema, source).REVIEW_BRANCH : undefined
}
