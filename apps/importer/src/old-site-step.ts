import type { Database } from '@fansite/db/client'

import type { OldSiteData } from './old-site-file.ts'

/** What a step writes through: the connection, or the transaction of a dry run. */
export type OldSiteDatabase = Pick<Database, 'delete' | 'insert' | 'select' | 'transaction' | 'update'>

/**
 * One step of `import.mjs --old-site`. `run` gets the connection (a transaction when the run is
 * a dry run) and everything in the files. It writes only what differs from the database, so a
 * second run changes nothing, and it never reads the old database: production can't reach it.
 */
export type OldSiteStep = {
  /** The name in the log, such as `clubs`, `spelers` or `selecties`. */
  name: string
  run: (db: OldSiteDatabase, data: OldSiteData) => Promise<OldSiteStepReport>
}

/** What a step of the import of the old site did, in numbers and in lines for the log. */
export type OldSiteStepReport = {
  /** Rows that existed and were changed. */
  changed: number
  /** Rows that were made. */
  created: number
  /** A line for each thing worth reading: a new club, a linked club, a skipped row. */
  lines: string[]
  /** Rows the step could not use, each with a line that says why. */
  skipped: number
  /** Rows that existed and are as the files say. */
  unchanged: number
}
