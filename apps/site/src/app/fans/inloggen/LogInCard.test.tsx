import type * as React from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { limitedMessage, logInErrorMessages, type LogInState } from '#src/fans/log-in-form'

import { LogInCard } from './LogInCard'
import { LogInForm } from './LogInForm'

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

const card = (props: Partial<Parameters<typeof LogInCard>[0]> = {}) =>
  renderToStaticMarkup(<LogInCard level={3} message="Log in om te proeven." returnTo="/fans/proef" {...props} />)

describe('the card to log in on a page of Fans', () => {
  it('is a white card with the heading, the message, the form and the page to come back to', () => {
    const html = card()

    expect(html).toMatch(/^<section class="hf-card" aria-labelledby="inloggen"><h3[^>]*>Inloggen<\/h3>/)
    expect(html).toContain('Log in om te proeven.')
    expect(html).toContain('Vul je e-mailadres in. We mailen je een link en een code. Je hebt geen wachtwoord nodig.')
    expect(html).toMatch(/name="terug"[^>]*value="\/fans\/proef"/)
    expect(html).toMatch(/autocomplete="email"/i)
    expect(html).toMatch(/<label[^>]*>E-mailadres/)
  })

  it('has the way to an account beside the button, after it', () => {
    expect(card()).toMatch(
      /hf-form-actions"><button[^>]*>Stuur me een link<\/button><p[^>]*>Nog geen account\? <a href="\/fans\/aanmelden">/,
    )
  })

  it('has no id twice', () => {
    const ids = [...card().matchAll(/ id="([^"]+)"/g)].map((match) => match[1])

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('puts an error at the field and in the list, one heading under its own', () => {
    show({ error: logInErrorMessages.invalid, value: 'geen-adres' })

    for (const [level, under] of [
      [2, 3],
      [3, 4],
    ] as const) {
      const html = card({ level })

      expect(html).toMatch(new RegExp(`<h${under}[^>]*>Kijk nog even naar 1 ding</h${under}>`))
      expect(html.split(logInErrorMessages.invalid)).toHaveLength(3)
      expect(html).toContain('value="geen-adres"')
    }
  })

  it('stands behind its fold, which is closed until the form comes back with an error or a limit', () => {
    const folded = () => card({ before: <p>Eerst dit.</p>, behind: 'Voorspellen' })
    const open = /<details[^>]* open=""/

    expect(folded()).toMatch(/<summary>Voorspellen[^]*<\/summary>[^]*Eerst dit\.[^]*Inloggen/)
    expect(folded()).not.toMatch(open)

    show({ error: logInErrorMessages.empty, value: '' })
    expect(folded()).toMatch(open)

    for (const failure of ['limited', 'ceiling'] as const) {
      show({ failure, value: 'fan@example.test' })
      expect(folded()).toMatch(open)
    }

    show({ failure: 'limited', value: '' })
    expect(card()).toContain(limitedMessage)
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
