// The export of the old fansite, `pnpm export:old-site`. It reads the database of the old site
// once, from a copy on your own computer, and writes the match facts to
// `apps/importer/data/oude-fansite/` and the friendlies to `docs/oefenwedstrijden-2002-03.md`.
// The import reads those files and never the old database (see the README of the importer).
// The command only reads: the connection is read-only and the queries are selects.
import { parseEnv } from '@fansite/shared/env'
import { createConnection, type RowDataPacket } from 'mysql2/promise'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import * as z from 'zod'

import type { OldSiteRows } from './old-site-export.ts'

import { buildOldSiteExport } from './old-site-export.ts'
import { oldSiteDataFolder } from './old-site-file.ts'

const oldDatabaseEnvSchema = z.object({
  OLD_DATABASE_URL: z.url({ protocol: /^mysql$/ }),
})

const friendliesFile = new URL('../../../docs/oefenwedstrijden-2002-03.md', import.meta.url)

async function main() {
  const { OLD_DATABASE_URL } = parseEnv(oldDatabaseEnvSchema, process.env)
  const result = buildOldSiteExport(await readRows(OLD_DATABASE_URL))
  const folder = fileURLToPath(oldSiteDataFolder)

  // A season that is no longer in the export must not stay behind as a file.
  await mkdir(folder, { recursive: true })
  for (const name of await readdir(folder)) {
    if (name.endsWith('.json')) {
      await rm(path.join(folder, name))
    }
  }
  for (const [name, content] of result.files) {
    await writeFile(path.join(folder, name), content)
  }

  // Prettier lines the table up the way the commit hook would, so a second run changes nothing.
  const filepath = fileURLToPath(friendliesFile)

  await writeFile(filepath, await format(result.friendliesMarkdown, { ...(await resolveConfig(filepath)), filepath }))

  console.log(result.report.join('\n'))
}

/**
 * Reads the tables the export needs. It asks for named columns only: of the reports it takes
 * the referee and the attendance, and of the players the name, the code and the line (`linie`),
 * so nothing else of the old database can reach the files.
 */
async function readRows(url: string): Promise<OldSiteRows> {
  const connection = await createConnection({ charset: 'UTF8MB4_UNICODE_CI', dateStrings: true, uri: url })

  try {
    await connection.query('SET SESSION TRANSACTION READ ONLY')

    const select = async <Row>(sql: string) => (await connection.query<RowDataPacket[]>(sql))[0] as Row[]

    return {
      clubs: await select('SELECT code, land, naam FROM club ORDER BY code'),
      events: await select(
        'SELECT id, wsd_code, wsd_seizoen, spr_code, spr_naam, gebeurtenis, minuut, assist, soort FROM wedstrijd_krk ORDER BY id',
      ),
      lineups: await select(
        'SELECT id, ops_id, wsd_code, wsd_seizoen, spr_code, spr_naam, mi, mu FROM wedstrijd_ops ORDER BY id',
      ),
      matches: await select(
        'SELECT code, seizoen, dt, competitie, speelronde, opmerking FROM wedstrijd ORDER BY dt, code',
      ),
      players: await select('SELECT voornaam, tussenvoegsel, achternaam, code, linie FROM speler ORDER BY code'),
      reports: await select(
        'SELECT wsd_code, wsd_seizoen, scheidsrechter, toeschouwers FROM wedstrijd_vsg ORDER BY id',
      ),
      results: await select(
        'SELECT wsd_code, wsd_seizoen, rt, ru, et, eu, ht, hu, bt, bu, ot, ou, opmerking FROM wedstrijd_res ORDER BY id',
      ),
    }
  } finally {
    await connection.end()
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
