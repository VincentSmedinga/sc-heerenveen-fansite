import type * as React from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { limitedMessage, logInErrorMessages, type LogInState } from '#src/fans/log-in-form'

import { LogInForm } from './LogInForm'
import { PageLogIn } from './PageLogIn'

const { state } = vi.hoisted(() => ({ state: { current: { value: '' } as unknown } }))

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof React>()),
  useActionState: () => [state.current, () => undefined],
}))
vi.mock('./actions', () => ({ requestLogIn: vi.fn() }))

const show = (next: LogInState) => {
  state.current = next
}

beforeEach(() => show({ value: '' }))

const show1 = (props: Partial<Parameters<typeof PageLogIn>[0]> = {}) =>
  renderToStaticMarkup(<PageLogIn message="Log in om te proeven." returnTo="/fans/proef" {...props} />)

describe('the way in inside the card of a game', () => {
  it('is a rule, one paragraph that opens with the message, and the form, without a card or heading', () => {
    const html = show1()

    expect(html).toMatch(/^<hr\/><p><strong>Log in om te proeven\.<\/strong> We mailen je een link en een code\.<\/p>/)
    expect(html).not.toContain('hf-card')
    expect(html).not.toMatch(/<h\d/)
    expect(html).toMatch(/name="terug"[^>]*value="\/fans\/proef"/)
    expect(html).toMatch(/autocomplete="email"/i)
    expect(html).toMatch(/<label[^>]*>E-mailadres/)
  })

  it('has the way to an account beside the button, after it', () => {
    expect(show1()).toMatch(
      /hf-form-actions"><button[^>]*>Stuur me een link<\/button><a href="\/fans\/aanmelden">Maak een account<\/a>/,
    )
  })

  it('stands behind its fold, which is closed until the form comes back with an error or a limit', () => {
    const folded = () => show1({ before: <p>Eerst dit.</p>, behind: 'Voorspellen' })
    const open = /<details[^>]* open=""/

    expect(folded()).toMatch(/<summary>Voorspellen[^]*<\/summary>[^]*Eerst dit\.[^]*<hr\/>[^]*Log in om te proeven/)
    expect(folded()).not.toMatch(open)

    show({ error: logInErrorMessages.empty, value: '' })
    expect(folded()).toMatch(open)

    for (const failure of ['limited', 'ceiling'] as const) {
      show({ failure, value: 'fan@example.test' })
      expect(folded()).toMatch(open)
    }

    show({ failure: 'limited', value: '' })
    expect(show1()).toContain(limitedMessage)
  })
})

describe('the way in on its own', () => {
  it('is a white card with the heading Inloggen and no rule', () => {
    const html = show1({ card: 2 })

    expect(html).toMatch(/^<section class="hf-card" aria-labelledby="inloggen"><h2[^>]*>Inloggen<\/h2>/)
    expect(html).not.toContain('<hr')
  })

  it('has no id twice', () => {
    const ids = [...show1({ card: 2 }).matchAll(/ id="([^"]+)"/g)].map((match) => match[1])

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('puts an error at the field and in the list, one heading under the heading above it', () => {
    show({ error: logInErrorMessages.invalid, value: 'geen-adres' })

    for (const [card, under] of [
      [undefined, 3],
      [2, 3],
      [3, 4],
    ] as const) {
      const html = show1(card === undefined ? {} : { card })

      expect(html).toMatch(new RegExp(`<h${under}[^>]*>Kijk nog even naar 1 ding</h${under}>`))
      expect(html.split(logInErrorMessages.invalid)).toHaveLength(3)
      expect(html).toContain('value="geen-adres"')
    }
  })
})

describe('the form of the page to log in', () => {
  it('has the list of errors at level 2 and nothing beside the button', () => {
    show({ error: logInErrorMessages.empty, value: '' })

    const html = renderToStaticMarkup(<LogInForm returnTo={undefined} />)

    expect(html).toMatch(/<h2[^>]*>Kijk nog even naar 1 ding<\/h2>/)
    expect(html).not.toContain('hf-form-actions')
    expect(html).not.toContain('name="terug"')
  })
})
