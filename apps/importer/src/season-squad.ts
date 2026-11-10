// What a reader of the squad of an earlier season gives back. Every reader (the Dutch squad
// table, the tables of 1990/91 to 1999/00 and 2005/06, the English pages, the lists of
// transfers and the lists of goals) returns this one shape, so the store and the completeness
// check do not need to know which page a squad came from. A reader never guesses: a page that
// has changed shape is an `error`, and a season without a page or table is `none`.
import type { PlayerPosition, PlayerSource } from '@fansite/db/schema'

/** One player as a page gives him. A number or a field the page does not give is null. */
export type SeasonPlayer = {
  /** The matches the player played this season, all competitions the table gives added up. */
  appearances: null | number
  /** The code of two letters of the flag the page shows (`NL`), or null when it shows none. */
  country: null | string
  /**
   * The page of the English Wikipedia the name links to (`Mark Uth`), for a reader of that
   * Wikipedia; null elsewhere. Only the importer of the persons uses it (issue 1043).
   */
  englishPage?: null | string
  /** The goals of the player this season, all competitions the table gives added up. */
  goals: null | number
  /** The name as the page shows it, such as `Joost van Aken`. */
  name: string
  /**
   * The page the name links to, such as `Pim Verbeek (voetballer, 1999)`, with the addition
   * still on it. Null when the page does not link the name.
   */
  page: null | string
  /** Null when the page does not say it, as in a list of goals. */
  position: null | PlayerPosition
  /** Null when the page does not give a shirt number, or gives a dash. */
  shirtNumber: null | number
}

export type SeasonSquad =
  | {
      /** The matches of all players added up, or null when the page does not give them. */
      appearancesTotal: null | number
      /** The goals of all players added up, or null when the page does not give them. */
      goalsTotal: null | number
      kind: 'read'
      players: SeasonPlayer[]
      /** What kind of list this is, as stored in `players.source`. */
      source: PlayerSource
      /** What was left out and why, one sentence each. */
      warnings: string[]
    }
  | {
      /** The page has changed shape, or says something we do not know: `message` says what. */
      kind: 'error'
      message: string
    }
  | {
      kind: 'none'
      /** Why the page or the table is not there for this season, in one sentence. */
      reason: string
    }
