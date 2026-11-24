import type { Competition } from '@fansite/db/schema'

/**
 * A stored result that is wrong, and the result that is right (#1637). The cross table of a
 * season on Wikipedia has a cell that is not the result of the league match (it has the
 * play-off), and the step `fillResultsFromCrossTables` stored it before the programme of the
 * season could say otherwise. The programme step (`fillFromSeasonProgramme`) puts the right
 * result there, and only while the match still has the wrong one, so a result that the editors
 * entered stays. A line can go once the run on production has made it.
 */
export type OldSiteResultCorrection = {
  /** The name of the club in the database. */
  club: string
  competition: Competition
  /** The date of the match, as `YYYY-MM-DD`. */
  date: string
  /** The result the stored match has now. */
  from: OldSiteScore
  home: boolean
  season: string
  /** Where the right result comes from. */
  source: string
  /** The result the programme has, and the match gets. */
  to: OldSiteScore
}

/** A score of sc Heerenveen first, the opponent second, whoever was at home. */
export type OldSiteScore = { against: number; for: number }

const programme = 'the programme table of the page Sc Heerenveen in het seizoen 2006/07, Dutch Wikipedia'

export const oldSiteResultCorrections: readonly OldSiteResultCorrection[] = [
  {
    club: 'Ajax',
    competition: 'Eredivisie',
    date: '2006-10-28',
    from: { against: 0, for: 1 },
    home: true,
    season: '2006/07',
    source: programme,
    to: { against: 2, for: 0 },
  },
  {
    club: 'Ajax',
    competition: 'Eredivisie',
    date: '2007-03-04',
    from: { against: 4, for: 0 },
    home: false,
    season: '2006/07',
    source: programme,
    to: { against: 0, for: 1 },
  },
]

/** The correction that is listed for a match, whatever result the match has now. */
export function correctionFor(
  match: { competition: string; home: boolean; matchDate: string; season: string },
  clubName: string,
  corrections: readonly OldSiteResultCorrection[] = oldSiteResultCorrections,
): OldSiteResultCorrection | undefined {
  return corrections.find(
    (one) =>
      one.season === match.season &&
      one.competition === match.competition &&
      one.date === match.matchDate &&
      one.home === match.home &&
      one.club === clubName,
  )
}
