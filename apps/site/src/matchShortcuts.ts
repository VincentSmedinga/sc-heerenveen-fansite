import type { Competition } from '@fansite/db/schema'

/** The name and the anchor of the card with how often each score was played, under Stand. */
export const scoreCountsCard = { id: 'hoe-vaak-welke-uitslag', name: 'Hoe vaak welke uitslag' } as const

/**
 * The links in the bar under the header of /wedstrijden: each goes to the heading of a card, in
 * the order the cards have on a narrow screen. The ids are those of the headings in
 * app/wedstrijden/matches-page.tsx (a test checks it). The cards with figures have their own
 * bar, on /statistieken (see statisticsShortcuts.ts).
 */
export const matchShortcuts = [
  { href: '#programma', label: 'Programma' },
  { href: '#uitslagen', label: 'Uitslagen' },
  { href: '#stand', label: 'Stand' },
  { href: `#${scoreCountsCard.id}`, label: scoreCountsCard.name },
] as const

/**
 * The name and the anchor of the card with the league table: Stand for the current season, and
 * Eindstand for a season that is over, where the table is the final one.
 */
export const standingsCardOf = (current: boolean) =>
  current ? ({ id: 'stand', name: 'Stand' } as const) : ({ id: 'eindstand', name: 'Eindstand' } as const)

type Shortcut = { href: string; label: string }

const resultsCards: Record<Competition, { id: string; name: string }> = {
  Eredivisie: { id: 'uitslagen', name: 'Eredivisie' },
  'KNVB Beker': { id: 'uitslagen-knvb-beker', name: 'KNVB Beker' },
  'Play-offs Conference League': { id: 'uitslagen-play-offs', name: 'Play-offs Conference League' },
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
 * that have one, see `resultsCardsOf`), Stand (Eindstand for a season that is over) and the
 * card with how often each score was played. The card with the head coaches, after the one with
 * the scores, has a link when the season has a coach in the table (`coachCount` above 0).
 */
export const matchShortcutsOf = (
  current: boolean,
  coachCount = 0,
  withResults: readonly Competition[] = [],
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
      continue
    }

    links.push(shortcut)

    // The card with the head coaches comes after the one with the scores, under the table.
    if (shortcut.href === `#${scoreCountsCard.id}` && coachCount > 0) {
      links.push({ href: `#${coaches.id}`, label: coaches.name })
    }
  }

  return links
}
