/*
 * The addresses of the chapter Fans. This module imports nothing, so the main menu (a client
 * component) can use it without the settings of the parts (see fans.ts).
 */

export const fansPath = '/fans'

/** The page with the rules of all games, and the part about the game Prognose on it. */
export const rulesPath = `${fansPath}/spelregels`
export const predictionRulesAddress = `${rulesPath}#prognose`

/** The page with the Uitblinker of each season (issue 1474). */
export const yearWinnersPath = `${fansPath}/uitblinker/van-het-jaar`

/** The games, in the order of the bar under the menu. Fantest is an archive, but a part too. */
export const fansGames = [
  { href: `${fansPath}/prognose`, label: 'Prognose', part: 'prognose' },
  { href: `${fansPath}/uitblinker`, label: 'Uitblinker', part: 'uitblinker' },
  { href: `${fansPath}/fjouwer`, label: 'Fjouwer', part: 'vier' },
  { href: `${fansPath}/fantest`, label: 'Fantest', part: 'fantest' },
] as const

/**
 * Whether the path is a page of the account: signing up, logging in, Mijn account and its
 * pages, or the page of the link in a reminder. They have no bar of games under the menu, like
 * the login of the admin.
 */
export const isAccountPath = (pathname: string) =>
  ['aanmelden', 'herinnering', 'inloggen', 'mijn-account'].some(
    (page) => pathname === `${fansPath}/${page}` || pathname.startsWith(`${fansPath}/${page}/`),
  )
