import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { predictionRulesAddress } from '#src/fans-paths'
import { rulesShortcuts } from '#src/fans/rules-shortcuts'

import RulesPage from './page'
import { tieRule } from './RulesCards'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

afterEach(() => vi.unstubAllEnvs())

const render = () => renderToStaticMarkup(<RulesPage />)

/** The markup of the table whose caption starts with the text. */
const tableOf = (caption: string) =>
  render()
    .split('<table')
    .find((part) => part.includes(`>${caption}`)) ?? ''

const stub = (settings: Record<string, 'off' | 'on'>) => {
  for (const [name, value] of Object.entries({ FANS_ACCOUNTS: 'on', ...settings })) {
    vi.stubEnv(name, value)
  }
}

describe('the page with the rules', () => {
  it('answers "not found" while accounts are off', () => {
    stub({ FANS_ACCOUNTS: 'off', FANS_PROGNOSE: 'on' })

    expect(render).toThrow('NEXT_NOT_FOUND')
  })

  it('has one h1, then a card for each game that is on and the card Account, with anchors', () => {
    stub({ FANS_PROGNOSE: 'on', FANS_UITBLINKER: 'on' })
    const html = render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<h1[^>]*>Spelregels<\/h1>/)
    expect([...html.matchAll(/<h2[^>]*id="([^"]+)"/g)].map((match) => match[1])).toEqual([
      'prognose',
      'uitblinker',
      'account',
    ])
  })

  it('has a watermark on the cards of the games and none on the card Account', () => {
    stub({ FANS_PROGNOSE: 'on', FANS_UITBLINKER: 'on' })
    const cards = render().split('<section').slice(1)

    expect(cards).toHaveLength(3)
    expect(cards[0]).toContain('hf-card-game-prognose')
    expect(cards[1]).toContain('hf-card-game-uitblinker')
    expect(cards[2]).not.toContain('hf-card-game')
  })

  it('has the part of a game only while the game is on, and the card Account always', () => {
    stub({ FANS_PROGNOSE: 'off', FANS_UITBLINKER: 'on' })
    const html = render()

    expect(html).not.toContain('id="prognose"')
    expect(html).toContain('id="uitblinker"')
    expect(html).toContain('id="account"')

    stub({ FANS_PROGNOSE: 'on', FANS_UITBLINKER: 'off' })

    expect(render()).not.toContain('id="uitblinker"')
  })

  it('has headings in order under the h1, and a part for the account without a game', () => {
    stub({ FANS_PROGNOSE: 'off', FANS_UITBLINKER: 'off' })
    const html = render()

    expect(html).not.toMatch(/<h[34]/)
    expect(html).toContain('id="account"')
  })

  it('shows the rules of the Prognose: 90 minutes, no prizes, the editors decide, the tie rule', () => {
    stub({ FANS_PROGNOSE: 'on' })
    const html = render()

    expect(html).toContain('90 minuten plus blessuretijd')
    expect(html).toContain('Er zijn geen prijzen. Bij een onenigheid beslist de redactie.')
    expect(html).toContain(tieRule)
    expect(tieRule).toBe(
      'Gelijk? Meer precieze eindstanden eerst, dan meer precieze ruststanden, anders delen jullie een plaats.',
    )
    expect(html).toContain('Een perfecte voorspelling is 30 punten waard.')
  })

  it('shows the table of the scoring with the outcomes as rows and Rust and Eind as columns', () => {
    stub({ FANS_PROGNOSE: 'on' })
    const table = tableOf('Punten per onderdeel')
    const numbers = [...table.matchAll(/<td[^>]*>(\d+)<\/td>/g)].map((match) => Number(match[1]))

    expect(numbers).toEqual([10, 20, 5, 10, 2, 5])
    expect(table).toContain('Eén doelpuntental goed')
    expect(table).not.toContain('abbr')
  })

  it('shows the example as a table with a caption, and the points 30, 17, 12, 5 and 5', () => {
    stub({ FANS_PROGNOSE: 'on' })
    const table = tableOf('Voorbeeld')
    const totals = [...table.matchAll(/<tr[^>]*>.*?<td[^>]*>(\d+)<\/td><\/tr>/gs)].map((match) => Number(match[1]))

    expect(table).toContain('ruststand was 1–0 en de eindstand 2–1')
    expect(table).toContain('<th')
    expect(totals).toEqual([30, 17, 12, 5, 5])
  })

  it('links to the page of the ranking and, for the account, to Mijn account and the privacy page', () => {
    stub({ FANS_PROGNOSE: 'on' })
    const html = render()

    expect(html).toContain('href="/fans/prognose/stand"')
    expect(html).toContain('href="/fans/mijn-account"')
    expect(html).toContain('href="/privacy#account"')
  })

  it('has the anchors that the bar and the links use', () => {
    stub({ FANS_PROGNOSE: 'on', FANS_UITBLINKER: 'on' })
    const html = render()

    for (const { href } of rulesShortcuts(() => true)) {
      expect(html).toContain(`id="${href.slice(1)}"`)
    }

    expect(predictionRulesAddress).toBe('/fans/spelregels#prognose')
  })
})
