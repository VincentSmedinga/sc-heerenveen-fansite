import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SeasonSquadCard } from './SeasonSquadCard'
import { squadData } from './test-squad'

/** The card with the first two players of the test squad having a page, and the rest not. */
const html = renderToStaticMarkup(
  <SeasonSquadCard
    squad={{
      ...squadData,
      players: squadData.players.map((player, index) => ({
        ...player,
        personSlug: index < 2 ? `testspeler-${index + 1}` : null,
      })),
      seasonNumbers: new Map([['Testkeeper Een', 3]]),
    }}
  />,
)

describe('the links on the card Selectie', () => {
  it('makes the name of a player with a page one link, with the flag in it and the shirt number outside', () => {
    expect(html).toMatch(
      /hf-player-name-number">1<\/span> <span class="hf-player-name-line hf-player-name-line-flagged"><a class="hf-player-name-link" href="\/spelers\/testspeler-1"><span class="hf-player-name-flag"><img alt="" [^>]*\/><\/span><span class="hf-player-name-text">/u,
    )
  })

  it('links each player with a page to his own address', () => {
    expect([...html.matchAll(/href="(\/spelers\/[^"]+)"/g)].map((match) => match[1])).toEqual([
      '/spelers/testspeler-1',
      '/spelers/testspeler-2',
    ])
  })

  it('leaves a player without a page as plain text', () => {
    expect(html).toContain('Vier')
    expect(html).not.toMatch(/<a [^>]*>(?:(?!<\/a>).)*Vier/s)
    expect(html.match(/<a [^>]*href="\/spelers\//g)).toHaveLength(2)
  })
})

describe('the line behind the name (#811)', () => {
  it('shows the how-manyth season behind the name, outside the link', () => {
    expect(html).toContain('</a> <span class="hf-meta hf-player-name-meta">3e seizoen</span>')
  })

  it('shows nothing behind the other names', () => {
    expect(html.match(/hf-player-name-meta/g)).toHaveLength(1)
  })
})
