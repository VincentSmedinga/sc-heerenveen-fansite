import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { CompetitionTally } from './competitionTally'

import { CompetitionTallyCard } from './CompetitionTallyCard'
import { legendsOf } from './test-legend'
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
  { drawn: 5, goalsAgainst: 20, goalsFor: 25, label: 'Play-offs', lost: 6, played: 26, value: 'play-offs', won: 15 },
  {
    drawn: 4,
    goalsAgainst: 40,
    goalsFor: 38,
    label: 'UEFA Cup',
    lost: 13,
    played: 31,
    value: 'uefa-cup',
    won: 14,
  },
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
    expect(legendsOf(html)).toEqual(['gespeeld, winst, gelijk, verlies, doelpunten (voor–tegen)'])
    expect(html).toContain('<caption')
  })

  it('links each row to the search of matches with that competition chosen', () => {
    const html = render()

    expect(html).toContain('href="/wedstrijden/zoeken?competitie=eredivisie"')
    expect(html).toContain('href="/wedstrijden/zoeken?competitie=uefa-cup"')
    expect(html).not.toContain('competitie=europa')
  })

  it('says what the play-offs are only when the card has the row', () => {
    expect(render()).toContain('De play-offs zijn de wedstrijden tegen Nederlandse clubs om een plek in Europa.')
    expect(render(tallies.filter(({ value }) => value !== 'play-offs'))).not.toContain('De play-offs zijn')
  })
})
