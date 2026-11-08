// One spelling for a person the old editors typed in more than one way. The names of the
// opponents are free text in the line-ups and the events, so `Dirk Kuijt` and `Dirk Kuyt` would
// be two players. The owner decided each spelling below; any other near-duplicate stays as it
// is and is listed by the check report (`old-site-name-clusters.ts`) for the owner to decide.

/** The spelling the editors typed, and the one spelling it becomes. */
export const oldSiteNameCorrections: ReadonlyMap<string, string> = new Map([
  ['Dirk Kuyt', 'Dirk Kuijt'],
  ['Humphery Rudge', 'Humphrey Rudge'],
  ['Humprey Rudge', 'Humphrey Rudge'],
  ['Jurgen Dirckx', 'Jürgen Dirkx'],
  ['Jürgen Dirckx', 'Jürgen Dirkx'],
  ['Marc Luijpers', 'Mark Luijpers'],
  ['Mark Luypers', 'Mark Luijpers'],
  ['Mark Nygaard', 'Marc Nygaard'],
  ['Rahim Ouedraego', 'Rahim Ouédraogo'],
  ['Rahim Ouedraegou', 'Rahim Ouédraogo'],
  ['Rahim Ouedraogo', 'Rahim Ouédraogo'],
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
