// The commands that manage the accounts of the admin, `pnpm admin:create` and `pnpm
// admin:revoke`, and on the host the file that `assemble` makes of this one (see
// docs/acceptatieomgeving.md). It runs as soon as it loads, like the import command. It needs
// only DATABASE_URL, not the other variables of the site, so it runs on the host with the same
// file as the importer.
import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'

import { runAdminCommand } from './beheer/admin-command.ts'

const { close, db } = connect(readDatabaseEnv().DATABASE_URL)

try {
  process.exitCode = await runAdminCommand(db, process.argv.slice(2))
} finally {
  await close()
}
