import { seasonOf } from '@fansite/db/season'

import { reasonOf } from '../../../errors'
import { getMatchSeasons } from '../../../matches'
import { pickedAddress } from '../../../seasons'
import { matchesPath } from '../matches-page'

// Reads the seasons from the database on each request, like the page it sends visitors to.
export const dynamic = 'force-dynamic'

/**
 * What the button "Toon" of the season picker asks for, `/wedstrijden/kies?seizoen=2025-26`: it
 * sends the visitor on (303) to the address of that season. A value that isn't a season, one
 * that is given twice and a season without matches go back to `/wedstrijden`, and so does a
 * database that can't be read: the page itself shows what is wrong. The address is relative, so
 * it keeps the host the visitor came to.
 */
export async function GET(request: Request) {
  const values = new URL(request.url).searchParams.getAll('seizoen')
  let seasons: string[] = []

  try {
    seasons = await getMatchSeasons()
  } catch (error) {
    console.error(`Could not read the seasons for ${matchesPath}/kies: ${reasonOf(error)}`)
  }

  const address = pickedAddress(matchesPath, values.length === 1 ? values[0] : undefined, {
    current: seasonOf(new Date()),
    seasons,
  })

  return new Response(null, { headers: { Location: address }, status: 303 })
}
