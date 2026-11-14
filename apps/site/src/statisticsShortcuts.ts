/**
 * The links in the bar under the header of /wedstrijden/cijfers: one to the heading of each of
 * the four groups of cards, in the order of the page. The ids are those of the headings in
 * app/wedstrijden/cijfers/statistics-page.tsx (a test checks it). The anchors of the cards in
 * a group stay, for a link someone made, but the bar does not list them: a visitor reads a
 * group and finds its cards.
 */
export const statisticsShortcuts = [
  { href: '#competitie', label: 'Competitie' },
  { href: '#uitslagen', label: 'Uitslagen' },
  { href: '#doelpunten', label: 'Doelpunten' },
  { href: '#rondom-de-wedstrijd', label: 'Rondom de wedstrijd' },
] as const

/**
 * The links in the bar under the header of /spelers: the card with the squad of
 * the season, the card with the goal scorers, the card with the scorers of all time and the
 * card with the goals that stand out, in the order of the page. The ids are
 * those of their headings in app/spelers/players-page.tsx (a test checks it). They
 * are the same cards for a season that is over, so the bar is too.
 */
export const playersShortcuts = [
  { href: '#selectie', label: 'Selectie' },
  { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
  { href: '#sinds-1990-91', label: 'Sinds 1990/91' },
  { href: '#bijzondere-doelpunten', label: 'Bijzondere doelpunten' },
] as const

/**
 * The bar of /spelers for a season: the links above, and when the season has match reports
 * the cards from them (#832) in the order of the page: the table Alle spelers after the squad
 * in the main column, and the lists Assists and Minuten at the end of the sidebar. A season
 * without reports has none of these cards, so the bar has no links to them.
 */
export function playersShortcutsFor(hasReports: boolean) {
  if (!hasReports) {
    return playersShortcuts
  }

  const [squad, ...cards] = playersShortcuts

  return [
    squad,
    { href: '#alle-spelers', label: 'Alle spelers' },
    ...cards,
    { href: '#assists', label: 'Assists' },
    { href: '#minuten', label: 'Minuten' },
  ] as const
}
