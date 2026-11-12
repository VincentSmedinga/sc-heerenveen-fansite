import type { Competition } from '@fansite/db/schema'

/** The name and the anchor of the card with how often each score was played, on Cijfers. */
export const scoreCountsCard = { id: 'hoe-vaak-welke-uitslag', name: 'Hoe vaak welke uitslag' } as const

/**
 * The links in the bar under the header of /wedstrijden: each goes to the heading of a card, in
 * the order the cards have on a narrow screen. The ids are those of the headings in
 * app/wedstrijden/matches-page.tsx (a test checks it). The cards with figures have their own
 * bar, on /cijfers (see statisticsShortcuts.ts).
 */
export const matchShortcuts = [
  { href: '#stand', label: 'Stand' },
  { href: '#programma', label: 'Programma' },
  { href: '#uitslagen', label: 'Uitslagen' },
] as const

/** The name and the anchor of the card with the latest match that has begun. */
export const lastMatchCard = { id: 'laatste-wedstrijd', name: 'Laatste wedstrijd' } as const

/**
 * The name and the anchor of the card with the league table: Stand for the current season, and
 * Eindstand for a season that is over, where the table is the final one.
 */
export const standingsCardOf = (current: boolean) =>
  current ? ({ id: 'stand', name: 'Stand' } as const) : ({ id: 'eindstand', name: 'Eindstand' } as const)

/** The name and the anchor of the card with the results per head coach, on Cijfers. */
export const coachResultsCard = { id: 'resultaten-per-hoofdtrainer', name: 'Resultaten per hoofdtrainer' } as const

/** The name and the anchor of the card with our place after each round, under the table. */
export const placePerRoundShortcut = { id: 'verloop-op-de-ranglijst', name: 'Verloop op de ranglijst' } as const

/** The name and the anchor of the card with our place in every season, on Cijfers. */
export const finalPlacesShortcut = { id: 'onze-plek-door-de-jaren', name: 'Onze plek door de jaren' } as const

type Shortcut = { href: string; label: string }

const resultsCards: Record<Competition, { id: string; name: string }> = {
  'Champions League': { id: 'uitslagen-champions-league', name: 'Champions League' },
  'Eerste divisie': { id: 'uitslagen-eerste-divisie', name: 'Eerste divisie' },
  Eredivisie: { id: 'uitslagen', name: 'Eredivisie' },
  'Europacup II': { id: 'uitslagen-europacup-ii', name: 'Europacup II' },
  'Europa League': { id: 'uitslagen-europa-league', name: 'Europa League' },
  'Intertoto Cup': { id: 'uitslagen-intertoto-cup', name: 'Intertoto Cup' },
  'Johan Cruijff Schaal': { id: 'uitslagen-johan-cruijff-schaal', name: 'Johan Cruijff Schaal' },
  'KNVB Beker': { id: 'uitslagen-knvb-beker', name: 'KNVB Beker' },
  'Play-offs Champions League': { id: 'uitslagen-play-offs-champions-league', name: 'Play-offs Champions League' },
  'Play-offs Conference League': { id: 'uitslagen-play-offs', name: 'Play-offs Conference League' },
  'Play-offs Europa League': { id: 'uitslagen-play-offs-europa-league', name: 'Play-offs Europa League' },
  'Play-offs UEFA Cup': { id: 'uitslagen-play-offs-uefa-cup', name: 'Play-offs UEFA Cup' },
  'UEFA Cup': { id: 'uitslagen-uefa-cup', name: 'UEFA Cup' },
}

/**
 * The name and the anchor of the card with the results of one competition. The card of the
 * Eredivisie keeps the anchor `uitslagen` of the one card the page had, so an old link still
 * lands on it.
 */
export const resultsCardOf = (competition: Competition) => resultsCards[competition]

/**
 * The cards with results a page has, in the order they are on it: a card for each competition
 * with a result, and the one card Uitslagen for a season without a result, which holds the
 * sentence that says so. The current season and a season that is over work the same.
 */
export const resultsCardsOf = (withResults: readonly Competition[]) =>
  withResults.length === 0 ? [{ id: 'uitslagen', name: 'Uitslagen' }] : withResults.map(resultsCardOf)

/**
 * The name and the anchor of the card with the head coaches of a season: Hoofdtrainer for one,
 * Hoofdtrainers for more. The anchor is the same for both, so a link to it keeps working when
 * a season gets a second coach.
 */
export const coachesCardOf = (coachCount: number) =>
  ({ id: 'hoofdtrainer', name: coachCount === 1 ? 'Hoofdtrainer' : 'Hoofdtrainers' }) as const

/**
 * The links of the bar for the page of a season, in the order of the cards in the source, which
 * is the order on a narrow screen: Stand (Eindstand for a season that is over) first, and after
 * it the card with our place after each round when the season has one (`withPlacePerRound`),
 * or else the card with the head coaches when the season has a coach in the table (`coachCount`
 * above 0). Then comes the card Laatste wedstrijd when a match has begun (`withLastMatch`,
 * current season only), Programma (only the current season has it) and a link for each card
 * with results (`withResults` are the competitions that have one, see `resultsCardsOf`).
 */
export const matchShortcutsOf = (
  current: boolean,
  coachCount = 0,
  withResults: readonly Competition[] = [],
  withPlacePerRound = false,
  withLastMatch = false,
): Shortcut[] => {
  const standings = standingsCardOf(current)
  const coaches = coachesCardOf(coachCount)
  const links: Shortcut[] = [{ href: `#${standings.id}`, label: standings.name }]

  if (withPlacePerRound) {
    links.push({ href: `#${placePerRoundShortcut.id}`, label: placePerRoundShortcut.name })
  } else if (coachCount > 0) {
    // A season with the card of our place per round has no coaches card: that one lists them.
    links.push({ href: `#${coaches.id}`, label: coaches.name })
  }

  // The card with the last match is above Programma, in the current season only.
  if (current && withLastMatch) {
    links.push({ href: `#${lastMatchCard.id}`, label: lastMatchCard.name })
  }

  if (current) {
    links.push({ href: '#programma', label: 'Programma' })
  }

  links.push(...resultsCardsOf(withResults).map(({ id, name }) => ({ href: `#${id}`, label: name })))

  return links
}
