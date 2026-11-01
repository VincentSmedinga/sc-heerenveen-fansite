import type { AlertRun } from '@fansite/db/alerts'

import type { FeedReport } from './import-feeds.ts'
import type { HealthReport } from './import-matches.ts'

/**
 * What a report means for the mail about an import that keeps failing (see `recordRun` in the
 * database package), or undefined when it means nothing. It counts like the health of a feed
 * and of a season (`healthAfter`): an error is a failed run, and a feed or a season that is
 * read and stored, or found unchanged, is a run that worked. A request to wait, a refusal by
 * robots.txt and a run that did not ask are no fault of ours, and neither count nor reset.
 *
 * A warning inside a report that was stored, such as a change that waits for seven days, is no
 * failure either: the data is stored.
 */
export function alertRunOf(
  subject: { label: string; subject: string },
  report: FeedReport | HealthReport,
): AlertRun | undefined {
  switch (report.kind) {
    case 'blocked-by-robots':
    case 'postponed':
    case 'wait':
      return undefined
    case 'error':
      return { ...subject, error: report.message, ok: false }
    case 'imported':
    case 'not-modified':
      return { ...subject, ok: true }
  }
}

/** What the mail calls a feed: the source it belongs to. */
export function feedSubject(feed: { id: number; sourceName: string }) {
  return { label: `De feed van ${feed.sourceName}`, subject: `feed:${feed.id}` }
}

/** What the mail calls the import of the matches of a season. */
export function matchesSubject(season: string) {
  return { label: `De import van de wedstrijden ${season}`, subject: `matches:${season}` }
}

/** What the mail calls the import of the squad of a season. */
export function squadSubject(season: string) {
  return { label: `De import van de selectie ${season}`, subject: `squad:${season}` }
}
