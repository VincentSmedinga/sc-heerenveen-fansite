import { databaseEnvSchema } from '@fansite/db/env'
import { parseEnv } from '@fansite/shared/env'
import { mailEnvSchema, requireSmtpOutsideLocal } from '@fansite/shared/mail-env'
import { siteEnvSchema, siteOrigins } from '@fansite/shared/site-env'
import * as z from 'zod'

// The mail code is shared with the importer. The site reads the settings through here still.
export { readMailEnv } from '@fansite/shared/mail-env'

const schema = databaseEnvSchema
  .extend(siteEnvSchema.shape)
  .extend(mailEnvSchema.shape)
  .superRefine(requireSmtpOutsideLocal)

// Set by `pnpm review` (see scripts/review.js), and nowhere else. Optional, and not part of the
// schema above: only the dev server reads it, and the site must start without it.
const reviewEnvSchema = z.object({
  REVIEW_BRANCH: z
    .string()
    .regex(/^[\w./-]+$/, 'must be the name of a branch')
    .optional(),
})

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
  return siteOrigins[parseEnv(siteEnvSchema, source).SITE_ENV]
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
 * The name of the branch that `pnpm review` is showing, for the title of the tab. Only `next
 * dev` has one: a build, and so acceptance and production, never shows a branch, whatever
 * REVIEW_BRANCH holds. It reads only that variable and NODE_ENV.
 */
export function reviewBranch(source: Record<string, string | undefined> = process.env) {
  return source['NODE_ENV'] === 'development' ? parseEnv(reviewEnvSchema, source).REVIEW_BRANCH : undefined
}
