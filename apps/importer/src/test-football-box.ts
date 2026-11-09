import { readFileSync } from 'node:fs'

/**
 * The fixtures of the six pages with `football box` blocks, by the title of the page. Each is a
 * piece of the real page as it was on 9 November 2026: its headings, the line about the time
 * zone, the blocks of sc Heerenveen and one block of other clubs.
 */
const footballBoxFixtures: Readonly<Record<string, string>> = {
  '2007–08 UEFA Cup first round': 'uefa-cup-first-round-2007-08',
  '2008–09 UEFA Cup first round': 'uefa-cup-first-round-2008-09',
  '2008–09 UEFA Cup group stage': 'uefa-cup-group-stage-2008-09',
  '2009–10 SC Heerenveen season': 'season-2009-10',
  'KNVB Beker 2008/09 (mannen)': 'cup-2008-09',
  'Play-offs Nederlands voetbal 2008': 'playoffs-2008',
}

/** The titles of the six pages. */
export const footballBoxTitles = Object.keys(footballBoxFixtures)

/** The saved text of one of the six pages. */
export function footballBoxText(title: string): string {
  return readFileSync(
    new URL(`./fixtures/wikipedia-football-box-${footballBoxFixtures[title]}.wiki`, import.meta.url),
    'utf8',
  )
}
