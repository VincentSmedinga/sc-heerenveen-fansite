import { isFansPartOn } from '@fansite/shared/fans-env'

/**
 * The links in the bar "Op deze pagina" of the page with the rules: one to the card of each
 * game that is on, in the order of the cards, and the card Account. The ids are those of the
 * headings in app/fans/spelregels/RulesCards.tsx (a test checks it).
 */
export const rulesShortcuts = (isOn: (part: 'prognose' | 'uitblinker') => boolean = isFansPartOn) =>
  [
    ...(isOn('prognose') ? [{ href: '#prognose', label: 'Prognose' }] : []),
    ...(isOn('uitblinker') ? [{ href: '#uitblinker', label: 'Uitblinker' }] : []),
    { href: '#account', label: 'Account' },
  ] as const
