// One spelling for a person the old editors typed in more than one way. The names of the
// opponents are free text in the line-ups and the events, so `Dirk Kuijt` and `Dirk Kuyt` would
// be two players. The owner decided each spelling below; any other near-duplicate stays as it
// is and is listed by the check report (`old-site-name-clusters.ts`) for the owner to decide.
// A name of a player of ours comes from the old table `speler` or from a code, and goes through
// the same corrections (`resolveOldSiteCode`), so the step `spelers` finds a player who is in
// `players` already from another source, such as the squad of Wikipedia, and adds no other.

/** The spelling the editors typed, and the one spelling it becomes. */
export const oldSiteNameCorrections: ReadonlyMap<string, string> = new Map([
  ['Ali Elkhattabi', 'Ali El Khattabi'],
  ['Dirk Kuyt', 'Dirk Kuijt'],
  ['Ger Schaap', 'Gerrie Schaap'],
  ['Hennie Meijer', 'Henny Meijer'],
  ['Humphery Rudge', 'Humphrey Rudge'],
  ['Humprey Rudge', 'Humphrey Rudge'],
  ['Igor Kornejev', 'Igor Korneev'],
  ['Ivan Tzvekov', 'Ivan Tsvetkov'],
  ['Ivan Tzvetkov', 'Ivan Tsvetkov'],
  ['Jurgen Dirckx', 'Jürgen Dirkx'],
  ['Jürgen Dirckx', 'Jürgen Dirkx'],
  ['Lee-Roy Echteld', 'Leeroy Echteld'],
  ['Marc Luijpers', 'Mark Luijpers'],
  ['Mark Luypers', 'Mark Luijpers'],
  ['Mark Nygaard', 'Marc Nygaard'],
  ['Rahim Ouedraego', 'Rahim Ouédraogo'],
  ['Rahim Ouedraegou', 'Rahim Ouédraogo'],
  ['Rahim Ouedraogo', 'Rahim Ouédraogo'],
  ['Ronnie Venema', 'Ronny Venema'],
  ['Thomás Galásek', 'Tomáš Galásek'],
  ['Tomás Galásek', 'Tomáš Galásek'],
  ['Tom van der Leegte', 'Tommie van der Leegte'],
])

/** Names that look alike and are two people, so the check report does not list them. */
export const oldSiteDistinctNames: readonly (readonly string[])[] = [
  ['Brian Tevreden', 'Brian Tevreden II'],
  ['Ruud Kool', 'Ruud Knol'],
]

/** The name in a field of the file with single spaces and the owner's correction, or empty. */
export function cleanOldSiteName(name: null | string): string {
  const clean = (name ?? '').replace(/\s+/gu, ' ').trim()

  return oldSiteNameCorrections.get(clean) ?? clean
}

/**
 * Spellings on the squad cards that may be one person, not decided yet: the check report lists
 * them and nothing changes. They come from the squads, not from the files of the old fansite.
 */
export const oldSiteSquadNamesToDecide: readonly (readonly string[])[] = [
  ['Radoslav Samardžić', 'Radoslav Samardzic'],
  ['Jan Harm Schippers', 'Jan-Harm Schippers'],
  ['Robert van den Berg', 'Robert van der Berg'],
  ['Jordy Bruijn', 'Jordy Buijs'],
]
