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
 * The links in the bar under the header of /wedstrijden/cijfers/alle: one to the heading of
 * each of the four groups, in the order of the page. The first group is Seizoenen, where a
 * season has Competitie. The ids are those of the headings in
 * app/wedstrijden/cijfers/all-seasons-page.tsx (a test checks it).
 */
export const allSeasonsStatisticsShortcuts = [
  { href: '#seizoenen', label: 'Seizoenen' },
  { href: '#uitslagen', label: 'Uitslagen' },
  { href: '#doelpunten', label: 'Doelpunten' },
  { href: '#rondom-de-wedstrijd', label: 'Rondom de wedstrijd' },
] as const

/**
 * The links in the bar under the header of /spelers/cijfers: the cards in the order of the
 * page, the main column first, which is the order on a narrow screen: the card Doelpuntenmakers
 * and the card with the goals that stand out. The credit is not a card to jump to. They are the
 * same cards for a season that is over, so the bar is too. The ids are those of their headings.
 */
export const playerFiguresShortcuts = [
  { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
  { href: '#bijzondere-doelpunten', label: 'Bijzondere doelpunten' },
] as const

/**
 * The bar of /spelers/cijfers for a season: the links above, and when the season has match
 * reports the cards from them (#832) in the order of the page: the table Alle spelers after
 * Doelpuntenmakers in the main column, and the lists Assists, Minuten and Invallers die
 * scoorden at the start of the sidebar. A season without reports has none of these cards,
 * so the bar has no links to them.
 */
export function playerFiguresShortcutsFor(hasReports: boolean) {
  if (!hasReports) {
    return playerFiguresShortcuts
  }

  const [scorers, special] = playerFiguresShortcuts

  return [
    scorers,
    { href: '#alle-spelers', label: 'Alle spelers' },
    { href: '#assists', label: 'Assists' },
    { href: '#minuten', label: 'Minuten' },
    { href: '#invallers-die-scoorden', label: 'Invallers' },
    special,
  ] as const
}

/**
 * The bar of /spelers/cijfers/alle: the three cards in the order of the page, the main column
 * first. A card that has nothing to say is not on the page, and the bar leaves it out too (see
 * `allSeasonsShortcutsFor`). The ids are those of their headings.
 */
export const allSeasonsShortcuts = [
  { href: '#topscorers-sinds-1990-91', label: 'Topscorers' },
  { href: '#hattricks', label: 'Hattricks' },
  { href: '#strafschoppen', label: 'Strafschoppen' },
] as const

/** The bar of /spelers/cijfers/alle for the cards that are on the page. */
export const allSeasonsShortcutsFor = ({
  hattricks,
  penalties,
  scorers,
}: {
  hattricks: boolean
  penalties: boolean
  scorers: boolean
}) =>
  allSeasonsShortcuts.filter(({ href }) =>
    href === '#topscorers-sinds-1990-91' ? scorers : href === '#hattricks' ? hattricks : penalties,
  )
