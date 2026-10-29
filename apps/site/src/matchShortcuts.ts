/**
 * The links in the bar under the header of /wedstrijden: each goes to the heading of a card, in
 * the order the cards have on a narrow screen. The ids are those of the headings in
 * app/wedstrijden/page.tsx (a test checks it).
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
