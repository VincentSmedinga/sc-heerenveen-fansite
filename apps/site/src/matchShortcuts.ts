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
] as const

/**
 * The name and the anchor of the card with the league table: Stand for the current season, and
 * Eindstand for a season that is over, where the table is the final one.
 */
export const standingsCardOf = (current: boolean) =>
  current ? ({ id: 'stand', name: 'Stand' } as const) : ({ id: 'eindstand', name: 'Eindstand' } as const)

type Shortcut = { href: string; label: string }

/**
 * The name and the anchor of the card with the head coaches of a season: Hoofdtrainer for one,
 * Hoofdtrainers for more. The anchor is the same for both, so a link to it keeps working when
 * a season gets a second coach.
 */
export const coachesCardOf = (coachCount: number) =>
  ({ id: 'hoofdtrainer', name: coachCount === 1 ? 'Hoofdtrainer' : 'Hoofdtrainers' }) as const

/**
 * The links of the bar for the page of a season, in the order of the cards: all of them for the
 * current season, and for a season that is over the same without Programma, which has no card
 * there, and with Eindstand for Stand. The card with the head coaches, straight after the
 * table, has a link when the season has a coach in the table (`coachCount` above 0).
 */
export const matchShortcutsOf = (current: boolean, coachCount = 0): Shortcut[] => {
  const standings = standingsCardOf(current)
  const coaches = coachesCardOf(coachCount)
  const links: Shortcut[] = []

  for (const shortcut of matchShortcuts as readonly Shortcut[]) {
    if (shortcut.href === '#programma' && !current) {
      continue
    }

    if (shortcut.href !== '#stand') {
      links.push(shortcut)
      continue
    }

    links.push({ href: `#${standings.id}`, label: standings.name })

    if (coachCount > 0) {
      links.push({ href: `#${coaches.id}`, label: coaches.name })
    }
  }

  return links
}
