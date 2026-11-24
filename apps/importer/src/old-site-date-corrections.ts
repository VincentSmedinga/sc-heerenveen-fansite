import type { Competition } from '@fansite/db/schema'

/**
 * A date in the files of the old fansite that is wrong, and the date that is right (#1631).
 * The step `matches` pairs a stored match with the file by club and date, so it can't find the
 * match whose date changes by itself: this list says which stored date the new one replaces.
 * A line can go once the run on production has made it.
 */
export type OldSiteDateCorrection = {
  /** The club code of the old database, the part of the match code before the dot. */
  clubCode: string
  competition: Competition
  /** The date the stored match has now, as `YYYY-MM-DD`. */
  from: string
  home: boolean
  season: string
  /** Where the right date comes from. */
  source: string
  /** The date the file has, and the match gets. */
  to: string
}

export const oldSiteDateCorrections: readonly OldSiteDateCorrection[] = [
  {
    clubCode: 'rbcroosendaal',
    competition: 'Eerste divisie',
    from: '1992-03-28',
    home: true,
    season: '1992/93',
    source: 'Nederlandse Wikipedia',
    to: '1993-03-28',
  },
  {
    clubCode: 'heraclesalmelo',
    competition: 'Eredivisie',
    from: '2007-01-27',
    home: true,
    season: '2006/07',
    source: 'Nederlandse Wikipedia',
    to: '2007-01-26',
  },
]
