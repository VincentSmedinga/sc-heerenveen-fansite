import { coachResultsCard, finalPlacesShortcut, scoreCountsCard } from './matchShortcuts'

/**
 * The links in the bar under the header of /wedstrijden/cijfers: each goes to the heading of
 * one of the twelve cards with figures, in the order the cards have in the source, which is the
 * order on a narrow screen and the order of the two columns on a wide one, the left one first.
 * The three cards that stay the Eredivisie come first, above the switch. The ids are those of
 * the headings in app/wedstrijden/cijfers/statistics-page.tsx (a test checks it). The cards are
 * the same for a season that is over, so the bar is too. The card Opmerkelijk (id
 * `opmerkelijk`) is not in it: it is one fact that changes with the day, and it may not be
 * there.
 */
export const statisticsShortcuts = [
  { href: '#onze-plek-in-de-competitie', label: 'Plek in de competitie' },
  { href: `#${finalPlacesShortcut.id}`, label: finalPlacesShortcut.name },
  { href: '#verloop-van-het-seizoen', label: 'Verloop van het seizoen' },
  { href: '#hoe-de-wedstrijden-verlopen', label: 'Hoe wedstrijden verlopen' },
  { href: '#reeksen', label: 'Reeksen' },
  { href: '#thuis-en-uit', label: 'Thuis en uit' },
  { href: '#toeschouwers', label: 'Toeschouwers' },
  { href: `#${scoreCountsCard.id}`, label: scoreCountsCard.name },
  { href: '#de-nul-gehouden', label: 'De nul gehouden' },
  { href: '#doelpunten-per-kwartier', label: 'Doelpunten per kwartier' },
  { href: '#uitersten', label: 'Uitersten' },
  { href: `#${coachResultsCard.id}`, label: coachResultsCard.name },
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
 * Doelpuntenmakers in the main column, and the lists Assists and Minuten at the start of the
 * sidebar. A season without reports has none of these cards, so the bar has no links to them.
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
    special,
  ] as const
}
