import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchSeasons } from '../../../../matches'
import { GET } from './route'

vi.mock('../../../../matches', () => ({ getMatchSeasons: vi.fn() }))

// The afternoon of Friday 23 October 2026, in the season 2026/27.
const now = new Date('2026-10-23T13:40:00Z')

const ask = (search: string) => GET(new Request(`https://sc.heerenveen.org/statistieken/spelers/kies${search}`))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26', '2024/25'])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('/statistieken/spelers/kies', () => {
  it('sends the visitor on, with a 303, to the address of the season that was picked', async () => {
    const response = await ask('?seizoen=2025-26')

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/statistieken/spelers/2025-26')
  })

  it('sends the current season to /statistieken/spelers, which is its address', async () => {
    const response = await ask('?seizoen=2026-27')

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/statistieken/spelers')
  })

  it.each([
    '',
    '?seizoen=',
    '?seizoen=onzin',
    '?seizoen=2025/26',
    '?seizoen=2025-27',
    '?seizoen=2010-11',
    '?seizoen=2027-28',
    '?seizoen=2025-26&seizoen=2024-25',
    '?seizoen[]=2025-26',
    '?anders=2025-26',
    '?seizoen=%2F%2Fevil.example',
    '?seizoen=https://evil.example',
  ])('sends %j back to /statistieken/spelers', async (search) => {
    const response = await ask(search)

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/statistieken/spelers')
  })

  it('keeps the address relative, so the visitor stays on the host they came to', async () => {
    expect((await ask('?seizoen=2024-25')).headers.get('location')).toMatch(/^\/statistieken\/spelers/)
  })

  it('sends the visitor to /statistieken/spelers, where the page says what is wrong, when the database is down', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getMatchSeasons).mockRejectedValue(new Error('connect ECONNREFUSED'))

    const response = await ask('?seizoen=2025-26')

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/statistieken/spelers')
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('/statistieken/spelers/kies with the choice of the matches', () => {
  it('sends the choice on to the address of the season, as the season picker asks', async () => {
    expect((await ask('?seizoen=2025-26&competitie=eredivisie')).headers.get('location')).toBe(
      '/statistieken/spelers/2025-26?competitie=eredivisie',
    )
    expect((await ask('?seizoen=2026-27&competitie=eredivisie')).headers.get('location')).toBe(
      '/statistieken/spelers?competitie=eredivisie',
    )
  })

  it('keeps the choice when the season is not one, as the page then shows the current season', async () => {
    expect((await ask('?seizoen=onzin&competitie=eredivisie')).headers.get('location')).toBe(
      '/statistieken/spelers?competitie=eredivisie',
    )
  })

  it.each([
    '?seizoen=2025-26&competitie=',
    '?seizoen=2025-26&competitie=Eredivisie',
    '?seizoen=2025-26&competitie=alle',
    '?seizoen=2025-26&competitie=eredivisie&competitie=eredivisie',
    '?seizoen=2025-26&competitie[]=eredivisie',
  ])('leaves out %j, so the picker never sends a visitor to the page "niet gevonden"', async (search) => {
    expect((await ask(search)).headers.get('location')).toBe('/statistieken/spelers/2025-26')
  })
})
