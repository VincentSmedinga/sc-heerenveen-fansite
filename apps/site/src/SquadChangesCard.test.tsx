import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { SquadChanges } from './squad-changes'

import { SquadChangesCard } from './SquadChangesCard'

const changes: SquadChanges = {
  arrived: [
    {
      country: 'NL',
      givenName: 'Nina',
      href: '/spelers/nina-nieuw',
      key: 'Nina Nieuw',
      shirtNumber: 4,
      surname: 'Nieuw',
    },
  ],
  departed: [{ country: 'NL', givenName: 'Victor', key: 'Victor Vert', shirtNumber: 9, surname: 'Vert' }],
  incomplete: [],
  previous: '2025/26',
  source: { pages: [], wikidata: false },
}

const render = (given: Partial<SquadChanges> = {}) =>
  renderToStaticMarkup(<SquadChangesCard changes={{ ...changes, ...given }} />)
const plain = (html: string) => html.replaceAll(/<[^>]*>/g, ' ').replaceAll(/\s+/g, ' ')

describe('the card Veranderingen in de selectie', () => {
  it('is a soft card named by its h2, with the season it compares with and two lists named by their h3', () => {
    const html = render()

    expect(html).toContain('<section class="hf-card hf-card-soft" aria-labelledby="veranderingen-in-de-selectie">')
    expect(html).toContain('id="veranderingen-in-de-selectie">Veranderingen in de selectie</h2>')
    expect(plain(html)).toContain('Vergeleken met 2025/26.')
    expect(html.match(/<h3[^>]*>[^<]*<\/h3>/g)).toHaveLength(2)

    for (const [id, name] of [
      ['nieuw-in-de-selectie', 'Nina'],
      ['niet-meer-in-de-selectie', 'Victor'],
    ]) {
      expect(html).toMatch(new RegExp(`id="${id}">[^<]*</h3><ul[^>]*aria-labelledby="${id}"[^>]*>.*?${name}`))
    }
  })

  it('shows the names with a link to the page of a player who has one, without a number or a flag', () => {
    const html = render()

    expect(html).toContain('href="/spelers/nina-nieuw"')
    expect(html.match(/<a /g)).toHaveLength(1)
    expect(html).not.toContain('hf-player-name-number')
    expect(html).not.toContain('hf-flag')
  })

  it('keeps the heading of an empty part and says nobody', () => {
    const html = render({ departed: [] })

    expect(plain(html)).toContain('Niet meer in de selectie Niemand.')
    expect(html.match(/<ul/g)).toHaveLength(1)
  })

  it('ends with the seasons that miss players, and says nothing when both are complete', () => {
    expect(plain(render({ incomplete: ['2024/25'] }))).toContain(
      'Van 2024/25 missen we waarschijnlijk een paar spelers, dus een naam kan hier ten onrechte staan.',
    )
    expect(plain(render({ incomplete: ['2023/24', '2024/25'] }))).toContain(
      'Van 2023/24 en 2024/25 missen we waarschijnlijk',
    )
    expect(render()).not.toContain('ten onrechte')
  })
})
