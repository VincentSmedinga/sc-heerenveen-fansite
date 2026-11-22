import { cardExamples, exampleFacts, fullMatchExample, minutesExamples } from '@fansite/shared/fantasy-examples'
import { fantasyPoints, fantasyScoring } from '@fansite/shared/fantasy-points'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fjouwerRulesAddress, predictionRulesAddress } from '#src/fans-paths'
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
    stub({ FANS_PROGNOSE: 'on', FANS_UITBLINKER: 'on', FANS_VIER: 'on' })
    const html = render()

    for (const { href } of rulesShortcuts(() => true)) {
      expect(html).toContain(`id="${href.slice(1)}"`)
    }

    expect(predictionRulesAddress).toBe('/fans/spelregels#prognose')
  })
})

describe('the part Fjouwer', () => {
  const fjouwerOn = () => stub({ FANS_PROGNOSE: 'on', FANS_UITBLINKER: 'on', FANS_VIER: 'on' })

  it('is a card with a watermark, after Uitblinker and before Account, with an anchor', () => {
    fjouwerOn()
    const html = render()

    expect([...html.matchAll(/<h2[^>]*id="([^"]+)"/g)].map((match) => match[1])).toEqual([
      'prognose',
      'uitblinker',
      'fjouwer',
      'account',
    ])
    expect(html.split('<section').find((card) => card.includes('id="fjouwer"'))).toContain('hf-card-game-fjouwer')
    expect(fjouwerRulesAddress).toBe('/fans/spelregels#fjouwer')
  })

  it('is left out, with its link in the bar, while the game is off', () => {
    stub({ FANS_PROGNOSE: 'on', FANS_VIER: 'off' })

    expect(render()).not.toContain('id="fjouwer"')
    expect(rulesShortcuts((part) => part !== 'vier').map(({ href }) => href)).not.toContain('#fjouwer')
  })

  it('says how to choose: four players, two per line, until the kick-off, ten times', () => {
    fjouwerOn()
    const html = render()

    expect(html).toContain('Je kiest 4 spelers uit de selectie, hoogstens 2 per linie')
    expect(html).toContain('Je kunt je keuze wijzigen tot de aftrap.')
    expect(html).toContain('houd je de vier van de vorige wedstrijd')
    expect(html).toContain('hoogstens 10 wedstrijden per seizoen')
    expect(html).toContain('Je krijgt geen vervanger.')
  })

  it('shows the table of the points with the numbers that the sum uses', () => {
    fjouwerOn()
    const table = tableOf('Wat een speler oplevert')
    const numbers = [...table.matchAll(/<td[^>]*>([^<]+)<\/td>/g)].map((match) => match[1])
    const { goal } = fantasyScoring
    const minus = (n: number) => (n < 0 ? `−${-n}` : String(n))

    expect(numbers).toEqual(
      [
        fantasyScoring.playedShort,
        fantasyScoring.fullGame,
        goal.aanvaller,
        goal.middenvelder,
        goal.verdediger,
        fantasyScoring.assist,
        fantasyScoring.cleanSheet,
        fantasyScoring.yellow,
        fantasyScoring.red,
        fantasyScoring.ownGoal,
      ].map(minus),
    )
  })

  it('says what does not count and what stands out', () => {
    fjouwerOn()
    const html = render()

    expect(html).toContain('Een strafschop in een beslissende reeks telt niet')
    expect(html).toContain('De verlenging telt wel mee')
    expect(html).toContain('Blessuretijd telt niet als minuten')
    expect(html).toContain('geeft −8 en niet −11')
    expect(html).toContain('kijkt naar de hele wedstrijd')
    expect(html).toContain('Dat kan negatief zijn.')
  })

  it('says that the report decides, and when the points come', () => {
    fjouwerOn()
    const html = render()

    expect(html).toContain('De punten komen uit het verslag van de wedstrijd dat de redactie maakt.')
    expect(html).toContain('Een assist is het oordeel van de bron')
    expect(html).toContain('verschijnen als het verslag klaar is')
    expect(html).toContain('een correctie in het verslag corrigeert')
  })

  it('says how the ranking counts and when a name shows', () => {
    fjouwerOn()
    const html = render()

    expect(html).toContain('De stand telt per seizoen en alleen de wedstrijden met een klaar verslag.')
    expect(html).toContain('Je naam staat alleen in een stand als je dat wilt')
  })

  it('shows three examples as tables with a caption, with the points of the sum', () => {
    fjouwerOn()

    for (const [caption, examples, extra] of [
      ['Voorbeeld: een hele wedstrijd', fullMatchExample, 40],
      ['Voorbeeld: kaarten', cardExamples, undefined],
      ['Voorbeeld: minuten en tegendoelpunten', minutesExamples, undefined],
    ] as const) {
      const table = tableOf(caption)
      const cells = [...table.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((match) => match[1])
      const points = cells.filter((_cell, index) => index % 2 === 1)
      const expected = examples.map((example) => {
        const total = fantasyPoints(exampleFacts(example.facts))?.total ?? 0

        return total < 0 ? `−${-total}` : String(total)
      })

      expect(table).toContain('<th')
      expect(points.slice(0, examples.length)).toEqual(expected)
      expect(examples.map((example) => example.points)).toEqual(
        examples.map((example) => fantasyPoints(exampleFacts(example.facts))?.total),
      )

      if (extra !== undefined) {
        expect(points.at(-1)).toBe(String(extra))
      }
    }
  })
})
