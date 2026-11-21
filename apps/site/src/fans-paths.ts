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
