import type { SeasonSquad } from './season-squad'

/*
 * A made-up squad for the tests of the pages that show one: a season with the chance
 * `compleet`, players in the four positions, a shirt number for all but one, and the page of
 * the Dutch Wikipedia the list was read from. Read it next to `test-matches.ts`.
 */

const noName = { personFamilyName: null, personFamilyNamePrefix: null, personGivenName: null }

export const squadData: SeasonSquad = {
  completeness: { bestSource: 'selectie', level: 'compleet', playerCount: 5 },
  pages: [{ readAt: new Date('2026-10-23T11:30:00Z'), title: 'Sc Heerenveen in het seizoen 2026/27 (mannen)' }],
  players: [
    { name: 'Testkeeper Een', ...noName, position: 'doelman', searchTerm: 'Een', shirtNumber: 1, source: 'selectie' },
    {
      name: 'Testspeler van Twee',
      ...noName,
      position: 'verdediger',
      searchTerm: 'van Twee',
      shirtNumber: 4,
      source: 'selectie',
    },
    {
      name: 'Proefman Drie',
      personFamilyName: 'Drie',
      personFamilyNamePrefix: null,
      personGivenName: 'Proefman',
      position: 'middenvelder',
      searchTerm: 'Drie',
      shirtNumber: 8,
      source: 'selectie',
    },
    {
      name: 'Testaanvaller Vier',
      ...noName,
      position: 'aanvaller',
      searchTerm: 'Vier',
      shirtNumber: 9,
      source: 'selectie',
    },
    {
      name: 'Testreserve Vijf',
      ...noName,
      position: 'aanvaller',
      searchTerm: 'Vijf',
      shirtNumber: null,
      source: 'selectie',
    },
  ],
}
