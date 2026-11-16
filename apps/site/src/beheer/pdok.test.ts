import { describe, expect, it, vi } from 'vitest'

import { inNetherlands, lookupAddress, pdokReverseUrl } from './pdok'

const answer = (docs: unknown[], init: ResponseInit = {}) =>
  Promise.resolve(new Response(JSON.stringify({ response: { docs, numFound: docs.length } }), init))
const doc = {
  huisnummer: 5,
  postcode: '8448GK',
  straatnaam: 'Domela Nieuwenhuisweg',
  woonplaatsnaam: 'Heerenveen',
}

describe('inNetherlands', () => {
  it('is true for Heerenveen and false for Paris, Berlin and the middle of the sea', () => {
    expect(inNetherlands(52.96, 5.94)).toBe(true)
    expect(inNetherlands(48.85, 2.35)).toBe(false)
    expect(inNetherlands(52.52, 13.4)).toBe(false)
    expect(inNetherlands(55, 4)).toBe(false)
  })
})

describe('lookupAddress', () => {
  it('asks one fixed address with nothing but the coordinates, and gives the address as a proposal', async () => {
    const fetcher = vi.fn(() => answer([doc]))

    expect(await lookupAddress(52.9607, 5.9406, fetcher as unknown as typeof fetch)).toEqual({
      address: { place: 'Heerenveen', postcode: '8448 GK', street: 'Domela Nieuwenhuisweg 5' },
      kind: 'found',
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const asked = new URL(url)

    expect(`${asked.origin}${asked.pathname}`).toBe(pdokReverseUrl)
    expect([...asked.searchParams.keys()].toSorted()).toEqual(['fl', 'lat', 'lon', 'rows', 'type'])
    expect(asked.searchParams.get('lat')).toBe('52.960700')
    expect(asked.searchParams.get('lon')).toBe('5.940600')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.redirect).toBe('error')
    expect(init.credentials).toBeUndefined()
  })

  it('writes a letter and an addition after the house number', async () => {
    const fetcher = () => answer([{ ...doc, huisletter: 'a', huisnummertoevoeging: '2' }])

    expect(await lookupAddress(52.9, 5.9, fetcher)).toMatchObject({ address: { street: 'Domela Nieuwenhuisweg 5a-2' } })
  })

  it('says none when the nearest address is far away, as in a box round the Netherlands that is not the Netherlands', async () => {
    expect(await lookupAddress(51.26, 6.77, () => answer([{ ...doc, afstand: 40_000 }]))).toEqual({ kind: 'none' })
    expect(await lookupAddress(52.9, 5.9, () => answer([{ ...doc, afstand: 64.8 }]))).toMatchObject({ kind: 'found' })
  })

  it('says none for a point without an address', async () => {
    expect(await lookupAddress(52.9, 5.9, () => answer([]))).toEqual({ kind: 'none' })
  })

  it.each([
    ['an error from PDOK', () => answer([], { status: 500 })],
    ['a request that fails', () => Promise.reject(new Error('timeout'))],
    ['text that is not JSON', () => Promise.resolve(new Response('<html>'))],
    ['an answer of another shape', () => Promise.resolve(new Response('{"response":[]}'))],
    ['a postcode that is not one', () => answer([{ ...doc, postcode: 'x<script>' }])],
    ['a street with a control character', () => answer([{ ...doc, straatnaam: 'Weg\u0000' }])],
    ['a street of an absurd length', () => answer([{ ...doc, straatnaam: 'x'.repeat(500) }])],
    ['an answer that is far too big', () => Promise.resolve(new Response(' '.repeat(30_000)))],
  ])('says failed for %s, and never throws', async (_name, fetcher) => {
    expect(await lookupAddress(52.9, 5.9, fetcher as unknown as typeof fetch)).toEqual({ kind: 'failed' })
  })
})
