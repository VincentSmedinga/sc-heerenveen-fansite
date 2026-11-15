import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { CountryTally } from './countryTally'

import { CountryTallyCard } from './CountryTallyCard'
import { withoutIcons } from './without-icons'

const tallies: CountryTally[] = [
  { country: 'DE', drawn: 3, goalsAgainst: 12, goalsFor: 15, lost: 2, played: 10, won: 5 },
  { country: null, drawn: 1, goalsAgainst: 2, goalsFor: 1, lost: 1, played: 2, won: 0 },
]

const render = (rows = tallies) => withoutIcons(renderToStaticMarkup(<CountryTallyCard tallies={rows} />))

describe('CountryTallyCard', () => {
  it('has no card without a match', () => {
    expect(render([])).toBe('')
  })

  it('is a soft card named by its heading, with a real table with a caption and the same columns as Per competitie', () => {
    const html = render()

    expect(html).toContain('aria-labelledby="europa-per-land"')
    expect(html).toContain('id="europa-per-land"')
    expect(html).toContain('hf-card-soft')
    expect(html).toContain('<caption')
    expect(html).toContain('15–12')
    expect(html).toContain('G gespeeld, W winst, G gelijk, V verlies, D doelpunten (voor–tegen)')
  })

  it('shows the country in words after its flag, and the row without a country as Land onbekend', () => {
    const html = render()

    expect(html).toContain('Duitsland')
    expect(html).toContain('hf-country-name')
    expect(html).toContain('Land onbekend')
    expect(html.indexOf('Duitsland')).toBeLessThan(html.indexOf('Land onbekend'))
  })

  it('has no link in a row until the search has a filter for the country', () => {
    expect(render()).not.toContain('/wedstrijden/zoeken')
  })
})
