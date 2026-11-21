/*
 * The addresses of the chapter Fans. This module imports nothing, so the main menu (a client
 * component) can use it without the settings of the parts (see fans.ts).
 */

export const fansPath = '/fans'

/** The games, in the order of the bar under the menu. Fantest is an archive, but a part too. */
export const fansGames = [
  { href: `${fansPath}/prognose`, label: 'Prognose', part: 'prognose' },
  { href: `${fansPath}/uitblinker`, label: 'Uitblinker', part: 'uitblinker' },
  { href: `${fansPath}/fjouwer`, label: 'Fjouwer', part: 'vier' },
  { href: `${fansPath}/fantest`, label: 'Fantest', part: 'fantest' },
] as const

/**
 * Whether the path is a page of signing up or logging in: one narrow column with one task, with
 * no bar of games under the menu, like the login of the admin.
 */
export const isAccountPath = (pathname: string) =>
  ['aanmelden', 'inloggen'].some(
    (page) => pathname === `${fansPath}/${page}` || pathname.startsWith(`${fansPath}/${page}/`),
  )
