// The commands that back up the database and put a dump back, `pnpm db:backup` and `pnpm
// db:restore`, and on the host the file that `assemble` makes of this one (see
// docs/back-ups.md). It runs as soon as it loads, like the import command. It reads
// DATABASE_URL and BACKUP_FOLDER from the environment, so on the host cron starts it with the
// same file as the importer.
import { runBackupCommand } from './backup.ts'

process.exitCode = await runBackupCommand(process.argv.slice(2))
