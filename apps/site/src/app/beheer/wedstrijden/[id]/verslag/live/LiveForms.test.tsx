// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import { LiveEventForm, LiveEvents } from './LiveForms'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const players = [{ bench: false, id: 1, label: '9 Speler 9', onPitch: true, ours: true, starter: true }]
const action = () => Promise.resolve({ version: 1 })
const form = <LiveEventForm action={action} kind="kaart" opponent="N.E.C." players={players} title="Kaart" />

describe('Blessuretijd on the quick screen', () => {
  it('is on the page without JavaScript, next to Minuut, with its label saying it is optional', () => {
    const html = renderToStaticMarkup(form)

    expect(html).toContain('Blessuretijd')
    expect(html).toContain('niet verplicht')
    expect(html).not.toContain('Alleen als de minuut')
    expect(html).not.toContain('Blessuretijd in minuten')
  })

  it('shows for 45, 90, 105 and 120 and is gone for another minute, without moving the focus', () => {
    render(form)

    const minute = screen.getByLabelText('Minuut')

    minute.focus()
    for (const [value, shown] of [
      ['45', true],
      ['90', true],
      ['105', true],
      ['120', true],
      ['23', false],
      ['', false],
    ] as const) {
      fireEvent.change(minute, { target: { value } })
      expect(screen.queryByLabelText(/^Blessuretijd/u) !== null).toBe(shown)
      expect(document.activeElement).toBe(minute)
    }
  })

  it('has lost its value when it went, so nothing of it is sent', () => {
    render(form)

    const minute = screen.getByLabelText('Minuut')

    fireEvent.change(minute, { target: { value: '45' } })
    fireEvent.change(screen.getByLabelText(/^Blessuretijd/u), { target: { value: '3' } })
    fireEvent.change(minute, { target: { value: '23' } })
    fireEvent.change(minute, { target: { value: '45' } })
    expect((screen.getByLabelText(/^Blessuretijd/u) as HTMLInputElement).value).toBe('')
  })
})

describe('the forms of the quick screen', () => {
  it('ask "Voor wie", offer no yellow-red card and have the icon of saving', () => {
    const html = renderToStaticMarkup(form)

    expect(html).toContain('Voor wie')
    expect(html).not.toContain('Welke kant?')
    expect(html).not.toContain('Wie scoorde?')
    expect(html).toContain('>Rood<')
    expect(html).not.toContain('Geel-rood')
    expect(html).toMatch(/<button type="submit"><span class="hf-icon-head"><svg/u)
  })

  it('has no repeated question in the open part of an event', () => {
    const html = renderToStaticMarkup(
      <LiveEvents events={[{ action, id: 1, kind: 'kaart', text: "Gele kaart 12' Speler 9" } as never]} />,
    )

    expect(html).toContain('Haal weg: Gele kaart')
    expect(html).toContain('Ja, haal weg')
    expect(html).not.toContain('Weet je zeker')
  })
})

describe('the lists of a substitution', () => {
  const squad = [
    { bench: false, id: 1, label: '1 Keeper', onPitch: true, ours: true, starter: true },
    { bench: false, id: 2, label: '2 Back', onPitch: true, ours: true, starter: true },
    { bench: true, id: 3, label: '12 Invaller', onPitch: false, ours: true, starter: false },
    { bench: true, id: 4, label: '13 Reserve', onPitch: false, ours: true, starter: false },
    { bench: false, id: 11, label: '1 Doelman', onPitch: true, ours: false, starter: true },
    { bench: true, id: 13, label: '14 Wissel', onPitch: false, ours: false, starter: false },
  ]
  const moves = { cards: [{ at: 50, player: 4 }], substitutions: [{ at: 70, in: 3, out: 1 }] }
  const substitution = (
    <LiveEventForm action={action} kind="wissel" moves={moves} opponent="N.E.C." players={squad} title="Wissel" />
  )
  const options = (label: string) =>
    [...screen.getByLabelText(new RegExp(`^${label}`, 'u')).querySelectorAll('option')].map(
      (option) => option.textContent,
    )
  const side = (name: string) => fireEvent.click(screen.getByLabelText(name))

  it('has every player of both teams with the team name without JavaScript', () => {
    const html = renderToStaticMarkup(substitution)

    expect(html).toContain('sc Heerenveen: 1 Keeper')
    expect(html).toContain('N.E.C.: 14 Wissel')
  })

  it('is empty until the side is chosen, and says who to choose for', () => {
    render(substitution)

    expect(options('Speler die eruit gaat')).toEqual(['Kies eerst voor wie'])
    expect(options('Speler die erin komt')).toEqual(['Kies eerst voor wie'])
  })

  it('holds the players of the chosen team without the team name, and follows the minute', () => {
    render(substitution)
    side('sc Heerenveen')

    // No minute yet: everything entered counts, so 1 went off and 12 came on.
    expect(options('Speler die eruit gaat')).toEqual(['Kies een speler', '2 Back', '12 Invaller'])
    expect(options('Speler die erin komt')).toEqual(['Kies een speler'])

    fireEvent.change(screen.getByLabelText('Minuut'), { target: { value: '60' } })
    expect(options('Speler die eruit gaat')).toEqual(['Kies een speler', '1 Keeper', '2 Back'])
    // 13 was sent off at 50, and 12 comes on in another substitution.
    expect(options('Speler die erin komt')).toEqual(['Kies een speler'])

    fireEvent.change(screen.getByLabelText('Minuut'), { target: { value: '40' } })
    expect(options('Speler die erin komt')).toEqual(['Kies een speler', '13 Reserve'])
  })

  it('does the same for the opponent and says when a team has nobody', () => {
    render(substitution)
    side('N.E.C.')
    expect(options('Speler die eruit gaat')).toEqual(['Kies een speler', '1 Doelman'])
    expect(options('Speler die erin komt')).toEqual(['Kies een speler', '14 Wissel'])
    cleanup()
    render(<LiveEventForm action={action} kind="wissel" opponent="N.E.C." players={squad.slice(0, 4)} title="Wissel" />)
    side('N.E.C.')
    expect(options('Speler die eruit gaat')).toEqual(['Niemand van N.E.C. in het verslag'])
  })

  it('keeps a chosen player with a note when the minute changes, and clears both on another side', () => {
    render(substitution)
    side('sc Heerenveen')
    fireEvent.change(screen.getByLabelText('Minuut'), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText('Speler die eruit gaat'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Minuut'), { target: { value: '80' } })
    expect(options('Speler die eruit gaat')).toContain('1 Keeper (staat dan niet op het veld)')

    side('N.E.C.')
    expect((screen.getByLabelText('Speler die eruit gaat') as HTMLSelectElement).value).toBe('')
    expect((screen.getByLabelText('Speler die erin komt') as HTMLSelectElement).value).toBe('')
    expect(screen.getByRole('status').textContent).toBe('Spelers gewist: je koos een andere kant.')
  })

  it('ends the line about cleared players at the next choice, and says what the lists hold without JavaScript', () => {
    render(substitution)
    side('sc Heerenveen')
    fireEvent.change(screen.getByLabelText('Speler die eruit gaat'), { target: { value: '2' } })
    side('N.E.C.')
    expect(screen.getByRole('status').textContent).toBe('Spelers gewist: je koos een andere kant.')
    fireEvent.change(screen.getByLabelText('Speler die eruit gaat'), { target: { value: '11' } })
    expect(screen.getByRole('status').textContent).toBe('')

    const html = renderToStaticMarkup(substitution)

    expect(html).toContain('Alle spelers van beide teams staan in de lijst')
    expect(html).not.toContain('Alleen spelers van het gekozen team')
  })

  it('tells what the lists show, tied to the fields', () => {
    render(substitution)
    side('sc Heerenveen')

    const out = screen.getByLabelText('Speler die eruit gaat')

    expect(document.getElementById(out.getAttribute('aria-describedby') ?? '')?.textContent).toContain(
      'Alleen spelers van sc Heerenveen die op deze minuut op het veld staan.',
    )
  })
})
