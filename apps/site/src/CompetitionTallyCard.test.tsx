import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { CompetitionTally } from './competitionTally'

import { CompetitionTallyCard } from './CompetitionTallyCard'
import { withoutIcons } from './without-icons'

const tallies: CompetitionTally[] = [
  {
    drawn: 301,
    goalsAgainst: 1500,
    goalsFor: 1600,
    label: 'Eredivisie',
    lost: 389,
    played: 1126,
    value: 'eredivisie',
    won: 436,
  },
  { drawn: 33, goalsAgainst: 120, goalsFor: 110, label: 'Europa', lost: 37, played: 107, value: 'europa', won: 37 },
]

const render = (rows = tallies) => withoutIcons(renderToStaticMarkup(<CompetitionTallyCard tallies={rows} />))

describe('CompetitionTallyCard', () => {
  it('has no card without a match', () => {
    expect(render([])).toBe('')
  })

  it('is a soft card named by its heading, with a row for each competition and the same columns as Seizoen voor seizoen', () => {
    const html = render()

    expect(html).toContain('aria-labelledby="per-competitie"')
    expect(html).toContain('id="per-competitie"')
    expect(html).toContain('hf-card-soft')
    expect(html).toContain('1.126')
    expect(html).toContain('1600–1500')
    expect(html).toContain('G gespeeld, W winst, G gelijk, V verlies, D doelpunten (voor–tegen)')
    expect(html).toContain('<caption')
  })

  it('links each row to the search of matches with that competition chosen', () => {
    const html = render()

    expect(html).toContain('href="/wedstrijden/zoeken?competitie=eredivisie"')
    expect(html).toContain('href="/wedstrijden/zoeken?competitie=europa"')
  })

  it('says what Europa counts only when the card has the row', () => {
    expect(render()).toContain('Europa telt elke Europese beker en de play-offs erom.')
    expect(render(tallies.slice(0, 1))).not.toContain('Europa telt')
  })
})
