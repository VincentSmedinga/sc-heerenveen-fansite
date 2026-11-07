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
  { href: '#programma', label: 'Programma' },
  { href: '#uitslagen', label: 'Uitslagen' },
  { href: '#stand', label: 'Stand' },
] as const

/**
 * The name and the anchor of the card with the league table: Stand for the current season, and
 * Eindstand for a season that is over, where the table is the final one.
 */
export const standingsCardOf = (current: boolean) =>
  current ? ({ id: 'stand', name: 'Stand' } as const) : ({ id: 'eindstand', name: 'Eindstand' } as const)

/** The name and the anchor of the card with the results per head coach, on Cijfers. */
export const coachResultsCard = { id: 'resultaten-per-hoofdtrainer', name: 'Resultaten per hoofdtrainer' } as const

/** The name and the anchor of the card with our place in every season, under the table. */
export const finalPlacesShortcut = { id: 'onze-plek-door-de-jaren', name: 'Onze plek door de jaren' } as const

type Shortcut = { href: string; label: string }

const resultsCards: Record<Competition, { id: string; name: string }> = {
  'Champions League': { id: 'uitslagen-champions-league', name: 'Champions League' },
  'Eerste divisie': { id: 'uitslagen-eerste-divisie', name: 'Eerste divisie' },
  Eredivisie: { id: 'uitslagen', name: 'Eredivisie' },
  'Europacup II': { id: 'uitslagen-europacup-ii', name: 'Europacup II' },
  'Europa League': { id: 'uitslagen-europa-league', name: 'Europa League' },
  'Intertoto Cup': { id: 'uitslagen-intertoto-cup', name: 'Intertoto Cup' },
  'KNVB Beker': { id: 'uitslagen-knvb-beker', name: 'KNVB Beker' },
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
 * The links of the bar for the page of a season, in the order of the cards: Programma (only the
 * current season has it), a link for each card with results (`withResults` are the competitions
 * that have one, see `resultsCardsOf`) and Stand (Eindstand for a season that is over), and
 * after it the card with our place in every season when the page has one. The
 * card with the head coaches, after the table, has a link when the season has a coach in the
 * table (`coachCount` above 0).
 */
export const matchShortcutsOf = (
  current: boolean,
  coachCount = 0,
  withResults: readonly Competition[] = [],
  withFinalPlaces = false,
): Shortcut[] => {
  const standings = standingsCardOf(current)
  const coaches = coachesCardOf(coachCount)
  const links: Shortcut[] = []

  for (const shortcut of matchShortcuts as readonly Shortcut[]) {
    if (shortcut.href === '#programma' && !current) {
      continue
    }

    if (shortcut.href === '#uitslagen') {
      links.push(...resultsCardsOf(withResults).map(({ id, name }) => ({ href: `#${id}`, label: name })))
      continue
    }

    if (shortcut.href === '#stand') {
      links.push({ href: `#${standings.id}`, label: standings.name })

      if (withFinalPlaces) {
        links.push({ href: `#${finalPlacesShortcut.id}`, label: finalPlacesShortcut.name })
      }
      continue
    }

    links.push(shortcut)
  }

  // The card with the head coaches comes last, under the table.
  if (coachCount > 0) {
    links.push({ href: `#${coaches.id}`, label: coaches.name })
  }

  return links
}
