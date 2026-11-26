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

describe('the card Mutaties', () => {
  it('is a white card named by its h2, with two lists named by their h3, each with its number', () => {
    const html = render()

    expect(html).toContain('<section class="hf-card" aria-labelledby="mutaties">')
    expect(html).toContain('id="mutaties">Mutaties</h2>')
    expect(plain(html)).not.toContain('Vergeleken met')
    expect(html.match(/<h3[^>]*>[^<]*<\/h3>/g)).toHaveLength(2)

    for (const [id, heading, name] of [
      ['erin', 'Erin \\(1\\)', 'Nina'],
      ['eruit', 'Eruit \\(1\\)', 'Victor'],
    ]) {
      expect(html).toMatch(new RegExp(`id="${id}">${heading}</h3><ul[^>]*aria-labelledby="${id}"[^>]*>.*?${name}`))
    }

    expect(html.indexOf('id="erin"')).toBeLessThan(html.indexOf('id="eruit"'))
  })

  it('puts the two parts in the columns that stand side by side when the card is wide enough', () => {
    expect(render()).toMatch(
      /class="hf-card-columns"><div class="hf-card-columns-grid"><div class="hf-card hf-card-transparent"><h3[^>]*id="erin"/,
    )
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

    expect(plain(html)).toContain('Eruit (0) Niemand.')
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
