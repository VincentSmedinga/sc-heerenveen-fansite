import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { RatingMatch, RatingPlayer, RatingWindow } from '#src/fans/rating'

import { UitblinkerCard, uitblinkerCardData } from './UitblinkerCard'

const now = new Date('2026-11-22T12:00:00Z')
const match = { id: 1 } as RatingMatch
const players = Array.from({ length: 14 }, (_, index) => ({ appearanceId: index + 1 }) as RatingPlayer)
const open: RatingWindow = {
  closesAt: new Date('2026-11-26T19:00:00Z'),
  match,
  players,
  startsAt: new Date('2026-11-21T15:45:00Z'),
  state: 'open',
}
const before = new Date('2026-10-01T00:00:00Z')

describe('the card of the Uitblinker on Fans', () => {
  it('is green with the moment it closes for a visitor, without a button', () => {
    const data = uitblinkerCardData(open, undefined, now)

    expect(data.tag).toEqual({ text: 'Open tot do 20.00', tone: 'open' })
    expect(data.button).toBe(false)
  })

  it('is amber with the button for a supporter who has not graded yet', () => {
    const data = uitblinkerCardData(open, { createdAt: before, grades: 0 }, now)

    expect(data.tag).toEqual({ text: 'Nog te doen', tone: 'todo' })
    expect(data.text).toBe('Geef 14 spelers een cijfer. Kan tot donderdag 26 november, 20.00 uur.')
    expect(data.button).toBe(true)
  })

  it('is green again for a supporter who graded every player', () => {
    expect(uitblinkerCardData(open, { createdAt: before, grades: 14 }, now).tag.tone).toBe('open')
  })

  it('has no button and no "Nog te doen" for an account that is made after the match began', () => {
    const data = uitblinkerCardData(open, { createdAt: new Date('2026-11-22T00:00:00Z'), grades: 0 }, now)

    expect(data.button).toBe(false)
    expect(data.tag.tone).toBe('open')
  })

  it('is grey when the window is closed or no match was played, and says when it waits for the report', () => {
    expect(uitblinkerCardData({ ...open, state: 'closed' }, undefined, now).tag).toEqual({
      text: 'Gesloten',
      tone: 'closed',
    })
    expect(uitblinkerCardData({ state: 'none' }, undefined, now).tag.tone).toBe('closed')
    expect(
      uitblinkerCardData(
        { closesAt: open.closesAt, match, startsAt: open.startsAt, state: 'waiting' },
        { createdAt: before, grades: 0 },
        now,
      ),
    ).toMatchObject({ button: false, tag: { text: 'Nog niet open' } })
  })

  it('is a card of the game with its watermark and a heading of level 2', () => {
    const html = renderToStaticMarkup(
      <UitblinkerCard {...uitblinkerCardData(open, { createdAt: before, grades: 0 }, now)} />,
    )

    expect(html).toContain('hf-card-game-uitblinker')
    expect(html).toMatch(/<h2[^>]*>Uitblinker<\/h2>/)
    expect(html).toContain('hf-tag-todo')
    expect(html).toMatch(/<form[^>]*action="\/fans\/uitblinker"[^>]*>.*Cijfers geven/)
  })

  it('links to the page of the game when there is no button', () => {
    const html = renderToStaticMarkup(<UitblinkerCard {...uitblinkerCardData(open, undefined, now)} />)

    expect(html).toContain('<a href="/fans/uitblinker">Naar de Uitblinker</a>')
    expect(html).not.toContain('<button')
  })
})
