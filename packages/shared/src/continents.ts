import { countryCodes } from './countries'

/** The six continents of the overview of players, in the order the card names them. */
export const continents = ['europe', 'africa', 'asia', 'north-america', 'south-america', 'oceania'] as const

export type Continent = (typeof continents)[number]

/** The Dutch name of each continent. */
export const continentNames: Record<Continent, string> = {
  africa: 'Afrika',
  asia: 'Azië',
  europe: 'Europa',
  'north-america': 'Noord-Amerika',
  oceania: 'Oceanië',
  'south-america': 'Zuid-Amerika',
}

// One continent for each country, the way UEFA and the other confederations do: a country
// in two continents goes with its football association, so Turkey, Russia, Cyprus, Georgia,
// Armenia, Azerbaijan, Kazakhstan and Israel are Europe. Central America and the Caribbean are
// North America. A territory belongs with the country it is part of, and the few that have no
// people go with the nearest continent (Antarctica and Heard Island with Oceania, Bouvet Island
// and the French Southern Territories with Africa, South Georgia with South America).
const members: Record<Continent, string> = {
  africa:
    'AO BF BI BJ BV BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TF TG TN TZ UG YT ZA ZM ZW',
  asia: 'AE AF BD BH BN BT CN HK ID IN IO IQ IR JO JP KG KH KP KR KW LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TW UZ VN YE',
  europe:
    'AD AL AM AT AX AZ BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GE GG GI GR HR HU IE IL IM IS IT JE KZ LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM TR UA VA XK',
  'north-america':
    'AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT UM US VC VG VI',
  oceania: 'AQ AS AU CC CK CX FJ FM GU HM KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV VU WF WS',
  'south-america': 'AR BO BR CL CO EC FK GF GS GY PE PY SR UY VE',
}

/** The continent of each country in `countryCodes`. */
export const continentOfCountry: Readonly<Record<string, Continent>> = Object.fromEntries(
  continents.flatMap((continent) => members[continent].split(' ').map((code) => [code, continent] as const)),
)

/** The continent of a country code, or undefined for a code that is not in `countryCodes`. */
export function continentOf(code: string): Continent | undefined {
  return Object.hasOwn(continentOfCountry, code) ? continentOfCountry[code] : undefined
}

/** The players of each continent, from the country of each player (undefined if unknown). */
export function countByContinent(countries: readonly (string | undefined)[]): {
  counts: { continent: Continent; count: number; name: string }[]
  unknown: number
} {
  const tally = new Map<Continent, number>(continents.map((continent) => [continent, 0]))
  let unknown = 0

  for (const country of countries) {
    const continent = country === undefined ? undefined : continentOf(country)

    if (continent === undefined) {
      unknown += 1
    } else {
      tally.set(continent, (tally.get(continent) ?? 0) + 1)
    }
  }

  const counts = continents
    .map((continent) => ({ continent, count: tally.get(continent) ?? 0, name: continentNames[continent] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'nl'))

  return { counts, unknown }
}

// Kept so a country added to `countryCodes` without a continent fails the test, not the page.
export const countriesWithoutContinent = (): string[] => countryCodes.filter((code) => continentOf(code) === undefined)
