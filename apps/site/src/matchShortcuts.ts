/**
 * The links in the bar under the header of /wedstrijden: each goes to the heading of a card, in
 * the order the cards have on a narrow screen. The ids are those of the headings in
 * app/wedstrijden/matches-page.tsx (a test checks it).
 */
export const matchShortcuts = [
  { href: '#programma', label: 'Programma' },
  { href: '#uitslagen', label: 'Uitslagen' },
  { href: '#stand', label: 'Stand' },
  { href: '#onze-plek-in-de-competitie', label: 'Plek in de competitie' },
  { href: '#verloop-van-het-seizoen', label: 'Verloop van het seizoen' },
  { href: '#reeksen', label: 'Reeksen' },
  { href: '#thuis-en-uit', label: 'Thuis en uit' },
  { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
  { href: '#de-nul-gehouden', label: 'De nul gehouden' },
  { href: '#doelpunten-per-kwartier', label: 'Doelpunten per kwartier' },
  { href: '#hoe-de-wedstrijden-verlopen', label: 'Hoe wedstrijden verlopen' },
  { href: '#uitersten', label: 'Uitersten' },
] as const

/**
 * The name and the anchor of the card with the league table: Stand for the current season, and
 * Eindstand for a season that is over, where the table is the final one.
 */
export const standingsCardOf = (current: boolean) =>
  current ? ({ id: 'stand', name: 'Stand' } as const) : ({ id: 'eindstand', name: 'Eindstand' } as const)

/**
 * The links of the bar for the page of a season: all of them for the current season, and for a
 * season that is over the same without Programma, which has no card there, and with Eindstand
 * for Stand.
 */
export const matchShortcutsOf = (current: boolean) => {
  if (current) {
    return matchShortcuts
  }

  const { id, name } = standingsCardOf(false)

  return matchShortcuts
    .filter((shortcut) => shortcut.href !== '#programma')
    .map((shortcut) => (shortcut.href === '#stand' ? { href: `#${id}`, label: name } : shortcut))
}
