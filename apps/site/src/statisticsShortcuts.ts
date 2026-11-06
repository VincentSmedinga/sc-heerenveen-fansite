import { scoreCountsCard } from './matchShortcuts'

/**
 * The links in the bar under the header of /cijfers: each goes to the heading of one of
 * the ten cards with figures, in the order the cards have in the source, which is the order on
 * a narrow screen and the order of the two columns on a wide one, the left one first. The
 * three cards that stay the Eredivisie come first, above the switch. The ids
 * are those of the headings in app/cijfers/statistics-page.tsx (a test checks it). The
 * cards are the same for a season that is over, so the bar is too. The card Opmerkelijk (id
 * `opmerkelijk`) is not in it: it is one fact that changes with the day, and it may not be
 * there.
 */
export const statisticsShortcuts = [
  { href: '#onze-plek-in-de-competitie', label: 'Plek in de competitie' },
  { href: '#verloop-van-het-seizoen', label: 'Verloop van het seizoen' },
  { href: '#hoe-de-wedstrijden-verlopen', label: 'Hoe wedstrijden verlopen' },
  { href: '#reeksen', label: 'Reeksen' },
  { href: '#thuis-en-uit', label: 'Thuis en uit' },
  { href: '#toeschouwers', label: 'Toeschouwers' },
  { href: `#${scoreCountsCard.id}`, label: scoreCountsCard.name },
  { href: '#de-nul-gehouden', label: 'De nul gehouden' },
  { href: '#doelpunten-per-kwartier', label: 'Doelpunten per kwartier' },
  { href: '#uitersten', label: 'Uitersten' },
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
  { href: '#alle-tijden', label: 'Alle tijden' },
  { href: '#bijzondere-doelpunten', label: 'Bijzondere doelpunten' },
] as const
