import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SquadSummaryCard } from './SquadSummaryCard'

const render = (...args: Parameters<typeof SquadSummaryCard>) => renderToStaticMarkup(SquadSummaryCard(...args))
const plain = (html: string) => html.replaceAll(/<[^>]*>/g, ' ').replaceAll(/\s+/g, ' ')

describe('the card "In het kort"', () => {
  it('is a soft card with an h2 and a description list of the five lines in order, the average with a comma', () => {
    const html = render({ summary: { ages: { average: 24.34, oldest: 34, youngest: 17 }, countries: 11, players: 28 } })

    expect(html).toContain('<section class="hf-card hf-card-soft" aria-labelledby="in-het-kort">')
    expect(html).toContain('<h2 class="hf-heading-2" id="in-het-kort">In het kort</h2>')
    expect(html).toContain('<dl class="hf-description-list hf-description-list-stacked hf-description-list-aligned">')
    expect(plain(html)).toContain('Spelers 28 Gemiddelde leeftijd 24,3 jaar Jongste 17 jaar Oudste 34 jaar Landen 11')
    expect(html).not.toContain('Op basis van')
  })

  it('shows one decimal also for a whole average', () => {
    expect(plain(render({ summary: { ages: { average: 24, oldest: 30, youngest: 20 }, players: 3 } }))).toContain(
      '24,0 jaar',
    )
  })

  it('has the sentence with the basis under the lines', () => {
    const html = render({
      summary: {
        ages: { average: 24, oldest: 30, youngest: 20 },
        basis: { known: 23, total: 28 },
        countries: 5,
        players: 28,
      },
    })

    expect(plain(html)).toContain('23 van de 28 spelers')
    expect(html.indexOf('</dl>')).toBeLessThan(html.indexOf('23 van de 28 spelers'))
  })

  it('has no lines with an age and no line Landen when the summary has none', () => {
    const text = plain(render({ summary: { players: 28 } }))

    expect(text).toContain('Spelers 28')
    expect(text).not.toMatch(/leeftijd|Jongste|Oudste|Landen/)
  })
})
