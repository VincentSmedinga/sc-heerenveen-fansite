import type { Database } from './client.ts'
import type { NewSource } from './schema.ts'

import { connect } from './client.ts'
import { readDatabaseEnv } from './env.ts'
import { sources } from './schema.ts'

/**
 * Made-up sources for local development, with different policies and permissions. None is real: the domains end in
 * `.test`, which is reserved for tests and never resolves. The real sources come with #10 and #72.
 */
export const testSources = [
  {
    domain: 'testkrant.test',
    kind: 'news',
    name: 'Testkrant',
  },
  {
    consentNote: 'Verzonnen: toestemming gevraagd, nog geen antwoord.',
    consentStatus: 'asked',
    domain: 'proefnieuws.test',
    kind: 'news',
    name: 'Proefnieuws',
  },
  {
    allowImage: true,
    attribution: 'Voorbeeldkrant, met dank aan de redactie',
    consentDate: '2026-01-15',
    consentNote: 'Verzonnen: intro tot 200 tekens en foto, zonder insluiten.',
    consentStatus: 'given',
    domain: 'voorbeeldkrant.test',
    introMaxLength: 200,
    kind: 'news',
    name: 'Voorbeeldkrant',
  },
  {
    allowEmbed: true,
    consentDate: '2026-02-03',
    consentNote: 'Verzonnen: alleen insluiten van afleveringen.',
    consentStatus: 'given',
    domain: 'testpodcast.test',
    kind: 'podcast',
    name: 'Testpodcast',
  },
  {
    domain: 'proefforum.test',
    kind: 'forum',
    name: 'Proefforum',
  },
  {
    allowImage: true,
    consentDate: '2026-03-20',
    consentNote: 'Verzonnen: alleen foto.',
    consentStatus: 'given',
    domain: 'testclub.test',
    kind: 'club',
    name: 'Testclub',
  },
  {
    allowEmbed: true,
    consentDate: '2026-04-09',
    consentStatus: 'given',
    domain: 'voorbeeldvideo.test',
    kind: 'video',
    name: 'Voorbeeldvideo',
  },
  {
    domain: 'uitgezet.test',
    enabled: false,
    kind: 'news',
    name: 'Uitgezette testbron',
  },
] satisfies NewSource[]

/** Puts the test sources in the register. Running it again updates them by domain and adds no duplicates. */
export async function seedSources(db: Database) {
  for (const source of testSources) {
    await db.insert(sources).values(source).onDuplicateKeyUpdate({ set: source })
  }
}

if (import.meta.main) {
  const { close, db } = connect(readDatabaseEnv().DATABASE_URL)

  try {
    await seedSources(db)
    console.log(`The register holds the ${testSources.length} test sources.`)
  } finally {
    await close()
  }
}
