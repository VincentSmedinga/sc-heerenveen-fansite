import { readFileSync } from 'node:fs'

/**
 * The fixtures of the six pages with `football box` blocks, of the page with the league table
 * of 2008/09 and of the two pages of 2007/08 with tables per round, by the title of the page.
 * Each is a piece of the real page as it was on 9 November 2026, the two of 2007/08 on 26
 * November 2026: its headings, the line about the time zone, the blocks of sc Heerenveen and
 * one block of other clubs. The page with the league table has that table whole, with the
 * tables of the UEFA Cup and the cup above it and the heading after it. The league page of
 * 2007/08 has the final table and the whole programme, so the results add up to the table.
 * The cup page has the second and third round with our rows, the rows of Jong sc Heerenveen
 * and one row of other clubs.
 */
const footballBoxFixtures: Readonly<Record<string, string>> = {
  '2007–08 UEFA Cup first round': 'uefa-cup-first-round-2007-08',
  '2008–09 UEFA Cup first round': 'uefa-cup-first-round-2008-09',
  '2008–09 UEFA Cup group stage': 'uefa-cup-group-stage-2008-09',
  '2009–10 SC Heerenveen season': 'season-2009-10',
  'Eredivisie 2007/08 (mannenvoetbal)': 'league-2007-08',
  'KNVB Beker 2007/08 (mannen)': 'cup-2007-08',
  'KNVB Beker 2008/09 (mannen)': 'cup-2008-09',
  'Play-offs Nederlands voetbal 2008': 'playoffs-2008',
  'Sc Heerenveen in het seizoen 2008/09 (mannen)': 'club-season-2008-09',
}

/** The titles of the nine pages. */
export const footballBoxTitles = Object.keys(footballBoxFixtures)

/** The saved text of one of the nine pages. */
export function footballBoxText(title: string): string {
  return readFileSync(
    new URL(`./fixtures/wikipedia-football-box-${footballBoxFixtures[title]}.wiki`, import.meta.url),
    'utf8',
  )
}
