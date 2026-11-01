import * as z from 'zod'

/** Which environment the site and the importer run in. */
export const siteEnvSchema = z.object({
  SITE_ENV: z.enum(['local', 'acceptance', 'production']),
})

// The address of each environment (see the decision Adressen in docs/beslissingen.md). Locally
// it is `next dev`.
export const siteOrigins = {
  acceptance: 'https://acc.sc.heerenveen.org',
  local: 'http://localhost:3000',
  production: 'https://sc.heerenveen.org',
} as const
