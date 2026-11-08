// The import command, `pnpm run import`, and on the host the file that cron starts (see
// src/bundle.ts). It runs as soon as it loads, without `import.meta.main`, which Node only has
// since 24.2: an older Node 24 would skip the import and exit with 0. The command makes its own
// fetcher, which refuses every address that is not on the public internet.
//
// With `--status` it shows the health of the feeds instead (`pnpm run import:status`), so the
// host needs no second file. With `--season <season>` it reads one season that is over
// (`pnpm run import:season 2025/26`), once; the hourly import reads the current season only,
// and runs without any argument. With `--from-season <season>` it reads every season that is
// over from that season on, the oldest first (`pnpm run import:seasons 2020/21`). An option it
// doesn't know, a season without `--season` and a combination of the options stop it before it
// does anything.
//
// With `--squad <season>` it reads the squad of one season that is over from Wikipedia
// (`pnpm run import:squad 2007/08`), and with `--from-squad <season>` the squads of every
// season that is over from that season on (`pnpm run import:squads 1990/91`).
//
// With `--completeness` it works out again how likely it is that the squad of each season is
// whole, from the database and without a request (`pnpm run import:completeness`).
//
// With `--item-clubs` it works out again which professional clubs each headline names, from the
// database and without a request (`pnpm run import:item-clubs`).
//
// With `--old-site` it reads the match data of the old fansite (1990 to 2007) from the files in
// the repository, step by step (`pnpm run import:old-site`); `--dry-run` shows what it would do
// and writes nothing, and `--report` writes the check report as Markdown, also without writing
// anything to the database (`pnpm --silent run import:old-site --report`).
//
// With `--changes` it lists the changes of a match that wait for a decision, and with
// `--changes accept 12` or `--changes reject all` it decides them (`pnpm run import:changes`).
import { readDatabaseEnv } from '@fansite/db/env'
import { parseArgs } from 'node:util'

import { runChangesCommand } from './import-changes.ts'
import { runImport } from './import-feeds.ts'
import { oldSiteUsage, runOldSiteImport, runOldSiteReport } from './import-old-site.ts'
import { fromSeasonUsage, runSeasonImport, runSeasonsImport, seasonUsage } from './import-season.ts'
import { fromSquadUsage, runSquadImport, runSquadsImport, squadUsage } from './import-squads.ts'
import { showStatus } from './status.ts'
import { runCompletenessCommand } from './store-completeness.ts'
import { runItemClubsCommand } from './store-item-clubs.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    changes: { type: 'boolean' },
    completeness: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    'from-season': { type: 'boolean' },
    'from-squad': { type: 'boolean' },
    'item-clubs': { type: 'boolean' },
    'old-site': { type: 'boolean' },
    report: { type: 'boolean' },
    season: { type: 'boolean' },
    squad: { type: 'boolean' },
    status: { type: 'boolean' },
  },
})
const fromSeason = values['from-season']
const fromSquad = values['from-squad']
const modes = [
  values.changes,
  values.completeness,
  fromSeason,
  fromSquad,
  values['item-clubs'],
  values['old-site'],
  values.season,
  values.squad,
  values.status,
].filter(Boolean).length
const wrongArguments =
  modes > 1 ||
  (values['dry-run'] === true && values['old-site'] !== true) ||
  (values.report === true && (values['old-site'] !== true || values['dry-run'] === true)) ||
  (values.season === true || fromSeason === true || values.squad === true || fromSquad === true
    ? positionals.length > 1
    : values.changes !== true && positionals.length > 0)

if (wrongArguments) {
  console.error(
    `Wrong arguments. ${seasonUsage}\n${fromSeasonUsage}\n${squadUsage}\n${fromSquadUsage}\n${oldSiteUsage}\nOr use --status alone, --old-site (alone, or with --dry-run or --report) alone, --completeness alone, --item-clubs alone, --changes, or no argument for the hourly import.`,
  )
  process.exit(2)
}

const { DATABASE_URL } = readDatabaseEnv()

process.exitCode = fromSeason
  ? await runSeasonsImport(DATABASE_URL, positionals[0])
  : values.season
    ? await runSeasonImport(DATABASE_URL, positionals[0])
    : fromSquad
      ? await runSquadsImport(DATABASE_URL, positionals[0])
      : values.squad
        ? await runSquadImport(DATABASE_URL, positionals[0])
        : values.changes
          ? await runChangesCommand(DATABASE_URL, positionals)
          : values.status
            ? await showStatus(DATABASE_URL)
            : values.completeness
              ? await runCompletenessCommand(DATABASE_URL)
              : values['item-clubs']
                ? await runItemClubsCommand(DATABASE_URL)
                : values['old-site']
                  ? values.report
                    ? await runOldSiteReport(DATABASE_URL)
                    : await runOldSiteImport(DATABASE_URL, { dryRun: values['dry-run'] === true })
                  : await runImport(DATABASE_URL)
