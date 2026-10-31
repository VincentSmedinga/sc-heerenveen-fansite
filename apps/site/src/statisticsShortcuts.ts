/**
 * The links in the bar under the header of /statistieken: each goes to the heading of one of
 * the nine cards with figures, in the order the cards have in the source, which is the order on
 * a narrow screen and the order of the two columns on a wide one, the left one first. The ids
 * are those of the headings in app/statistieken/statistics-page.tsx (a test checks it). The
 * cards are the same for a season that is over, so the bar is too.
 */
export const statisticsShortcuts = [
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
 * The links in the bar under the header of /statistieken/spelers: the card with the goal
 * scorers and the card with the goals that stand out, in the order of the page. The ids are
 * those of their headings in app/statistieken/spelers/players-page.tsx (a test checks it). They
 * are the same cards for a season that is over, so the bar is too.
 */
export const playersShortcuts = [
  { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
  { href: '#bijzondere-doelpunten', label: 'Bijzondere doelpunten' },
] as const
