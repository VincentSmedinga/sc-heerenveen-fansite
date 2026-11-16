/**
 * The page of a match for the line of it in a list that runs over seasons, such as the
 * matches against a club: where it is, and whether it is the page of a match that is live or
 * of its Voorbeschouwing (see `getMatchPages` in `report-data.ts`).
 */
export type MatchPage = { href: string; live: boolean; preview: boolean }

/** What a match needs to find its page: the key of one match in a season, and the season. */
export type MatchPageKey = { competition: string; round: string; season: string }

/** The key of a match in the map of `getMatchPages`. */
export const matchPageKey = ({ competition, round, season }: MatchPageKey) => `${season}|${competition}|${round}`

/** The props of a line of a match for its page, or none for a match without a page. */
export const pageProps = (page: MatchPage | undefined) =>
  page === undefined ? {} : { live: page.live, preview: page.preview, reportHref: page.href }
