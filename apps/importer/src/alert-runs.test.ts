import { describe, expect, it } from 'vitest'

import type { FeedReport } from './import-feeds.ts'
import type { HealthReport } from './import-matches.ts'

import { alertRunOf, feedSubject, matchesSubject, squadSubject } from './alert-runs.ts'
import { healthAfter } from './run-log.ts'

const subject = { label: 'De feed van Voorbeeld', subject: 'feed:1' }
const now = new Date('2026-11-01T10:00:00Z')

const feedReports: FeedReport[] = [
  { kind: 'blocked-by-robots', url: 'https://example.org/rss' },
  { kind: 'error', message: 'HTTP 500', url: 'https://example.org/rss' },
  {
    added: 1,
    kind: 'imported',
    relevance: { doubtful: 0, irrelevant: 0, relevant: 1 },
    skipped: [],
    unchanged: 0,
    updated: 0,
    url: 'https://example.org/rss',
  },
  { kind: 'not-modified', url: 'https://example.org/rss' },
  { failuresInARow: 3, kind: 'postponed', retryAt: now, url: 'https://example.org/rss' },
  { kind: 'wait', retryAfterSeconds: 60, url: 'https://example.org/rss' },
]

describe('alertRunOf', () => {
  it('counts an error as a failed run, and a feed that is read or unchanged as a run that worked', () => {
    expect(alertRunOf(subject, { kind: 'error', message: 'HTTP 500', url: 'https://example.org/rss' })).toEqual({
      ...subject,
      error: 'HTTP 500',
      ok: false,
    })
    expect(alertRunOf(subject, { kind: 'not-modified', url: 'https://example.org/rss' })).toEqual({
      ...subject,
      ok: true,
    })
  })

  it('counts a stored season as a run that worked, whatever warnings it has', () => {
    const imported = { kind: 'imported', warnings: ['a result changed'] } satisfies HealthReport

    expect(alertRunOf(subject, imported)).toEqual({ ...subject, ok: true })
  })

  it('counts a request to wait, a refusal by robots.txt and a run that did not ask as nothing', () => {
    expect(alertRunOf(subject, { kind: 'wait', retryAfterSeconds: null })).toBeUndefined()
    expect(alertRunOf(subject, { kind: 'blocked-by-robots' })).toBeUndefined()
    expect(alertRunOf(subject, { kind: 'postponed' })).toBeUndefined()
  })

  it('counts a feed report as a failure or a success exactly when the health of the feed does', () => {
    for (const report of feedReports) {
      const failures = healthAfter({ failuresInARow: 2 }, report, now)?.failuresInARow
      const run = alertRunOf(subject, report)

      // The health raises the count on a failed run, resets it on a run that worked, and
      // leaves it alone otherwise.
      expect(run === undefined ? undefined : run.ok ? 0 : 3).toBe(failures)
    }
  })
})

describe('the subjects', () => {
  it('names the import so a mail says which one it is', () => {
    expect(feedSubject({ id: 12, sourceName: 'Leeuwarder Courant' })).toEqual({
      label: 'De feed van Leeuwarder Courant',
      subject: 'feed:12',
    })
    expect(matchesSubject('2026/27')).toEqual({
      label: 'De import van de wedstrijden 2026/27',
      subject: 'matches:2026/27',
    })
    expect(squadSubject('2026/27')).toEqual({ label: 'De import van de selectie 2026/27', subject: 'squad:2026/27' })
  })
})
