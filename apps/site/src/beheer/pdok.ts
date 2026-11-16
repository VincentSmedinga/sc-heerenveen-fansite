// The address at a point, from the Locatieserver of PDOK (the government service for
// addresses), for the button "Vul het adres in vanaf de coördinaten" in the admin (#1299).
// The rule "no requests to third parties" is about the browser of a visitor: this request is
// made by the server, for an editor, and carries nothing but the two coordinates, to one fixed
// address, with a time-out. What comes back is input from outside and is checked before an
// editor sees it as a proposal.
import * as z from 'zod'

import { hasOddCharacters } from './stadium-form'

/** The one address the site asks. */
export const pdokReverseUrl = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse'

/** How long the server waits for PDOK, in milliseconds. */
export const pdokTimeout = 5000

/** The most characters of an answer that is read. A real answer is a few hundred. */
const mostCharacters = 20_000

/** What a lookup gave: an address to propose, nothing at that point, or no usable answer. */
export type AddressLookup = { address: ProposedAddress; kind: 'found' } | { kind: 'failed' } | { kind: 'none' }

/** The fields of the form that a proposal fills in. The postcode is written `8448 GK`. */
export type ProposedAddress = { place: string; postcode: string; street: string }

/** How far the nearest address may be, in metres: past it, the point has no address. */
const farthest = 2000

/** The country the lookup works for: a rectangle round the Netherlands, in degrees. */
const netherlands = { east: 7.3, north: 53.7, south: 50.7, west: 3.2 }

/** Whether a point is in the Netherlands, which is where PDOK knows addresses. */
export function inNetherlands(latitude: number, longitude: number): boolean {
  return (
    latitude >= netherlands.south &&
    latitude <= netherlands.north &&
    longitude >= netherlands.west &&
    longitude <= netherlands.east
  )
}

const answerSchema = z.object({
  response: z.object({
    docs: z.array(
      z.object({
        afstand: z.number().nonnegative().optional(),
        huisletter: z.string().max(5).optional(),
        huisnummer: z.number().int().positive().max(99_999),
        huisnummertoevoeging: z.string().max(10).optional(),
        postcode: z.string().regex(/^[1-9]\d{3}[A-Z]{2}$/u),
        straatnaam: z.string().min(1).max(100),
        woonplaatsnaam: z.string().min(1).max(100),
      }),
    ),
  }),
})

/**
 * Asks PDOK for the address nearest to a point in the Netherlands. A request that does not
 * answer in time, answers with an error or answers with something else than the expected shape
 * is `failed`; a point without an address is `none`. `fetcher` is `fetch`, and a test gives
 * its own.
 */
export async function lookupAddress(
  latitude: number,
  longitude: number,
  fetcher: typeof fetch = fetch,
): Promise<AddressLookup> {
  const query = new URLSearchParams({
    fl: 'afstand,straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam',
    lat: latitude.toFixed(6),
    lon: longitude.toFixed(6),
    rows: '1',
    type: 'adres',
  })

  try {
    const answer = await fetcher(`${pdokReverseUrl}?${query}`, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(pdokTimeout),
    })

    if (!answer.ok) {
      return { kind: 'failed' }
    }

    const text = await answer.text()

    if (text.length > mostCharacters) {
      return { kind: 'failed' }
    }

    const parsed = answerSchema.safeParse(JSON.parse(text))

    if (!parsed.success) {
      return { kind: 'failed' }
    }

    const [found] = parsed.data.response.docs

    if (found === undefined || (found.afstand ?? 0) > farthest) {
      return { kind: 'none' }
    }

    const number = `${found.huisnummer}${found.huisletter ?? ''}${found.huisnummertoevoeging === undefined ? '' : `-${found.huisnummertoevoeging}`}`
    const address = {
      place: found.woonplaatsnaam,
      postcode: `${found.postcode.slice(0, 4)} ${found.postcode.slice(4)}`,
      street: `${found.straatnaam} ${number}`,
    }

    return Object.values(address).some(hasOddCharacters) ? { kind: 'failed' } : { address, kind: 'found' }
  } catch {
    return { kind: 'failed' }
  }
}
