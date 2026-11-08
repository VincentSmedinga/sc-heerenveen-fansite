// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import { LiveEventForm, LiveEvents } from './LiveForms'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const players = [{ bench: false, id: 1, label: '9 Speler 9', onPitch: true, ours: true }]
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
