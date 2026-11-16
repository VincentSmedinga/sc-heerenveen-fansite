// Reads every person who was read from Wikidata before once again (#1289), for the two facts
// the importer did not store then: the countries he plays for and the country of his birth
// place. A person stored by a normal run, or by this command, has `country_facts_read_at`, so a
// second run finds nobody and asks nothing. The command takes the lock of the import, so it
// never runs beside a run of cron, and it keeps the pauses and the stops of the import.
import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'

import type { ImportOptions } from './import-feeds.ts'

import { createFetcher } from './fetcher.ts'
import { wikipediaOrigin } from './import-matches.ts'
import { describePersonData, readPersonData, wikidataOrigin } from './import-person-data.ts'
import { robotsStoreFor } from './robots-store.ts'

/**
 * The command `pnpm run import:country-facts`, and `import.mjs --country-facts` on the host.
 * Returns the exit code: 0, or 1 when the lock is held.
 */
export async function runCountryFactsCommand(
  databaseUrl: string,
  {
    clock = () => new Date(),
    makeFetcher = (robots) => createFetcher({ robots }),
    personDataPause,
    wikidataOrigin: wikidata = wikidataOrigin,
    wikipediaOrigin: origin = wikipediaOrigin,
    write = console.log,
  }: Pick<
    ImportOptions,
    'clock' | 'makeFetcher' | 'personDataPause' | 'wikidataOrigin' | 'wikipediaOrigin' | 'write'
  > = {},
): Promise<number> {
  const { close, db, pool } = connect(databaseUrl)

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, () =>
      readPersonData(db, makeFetcher(robotsStoreFor(db, clock)), {
        clock,
        countryFacts: true,
        origin: origin ?? wikipediaOrigin,
        wikidata: wikidata ?? wikidataOrigin,
        ...(personDataPause === undefined ? {} : { pause: personDataPause }),
      }),
    )

    if (!run.ran) {
      write('An import is still running on this database, so this command does nothing. Try again in a few minutes.')

      return 1
    }

    const lines = [...run.result.warnings, ...describePersonData(run.result)]

    for (const line of lines.length === 0 ? ['Country facts: nobody to read.'] : lines) {
      write(line)
    }

    return 0
  } finally {
    await close()
  }
}
