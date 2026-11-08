// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { FinishFormState } from '../actions'

import { FinishForm } from './FinishForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const wrong = 'Vul een aantal doelpunten in, een heel getal van 0 tot 99.'

function form(answer: FinishFormState = {}, home = true) {
  return (
    <FinishForm
      action={() => Promise.resolve(answer)}
      cancelHref="/beheer/wedstrijden/7/verslag"
      counted={{ against: 1, for: 2 }}
      home={home}
      opponent="N.E.C."
    />
  )
}

const input = (name: string) => document.querySelector(`[name="${name}"]`) as HTMLInputElement

describe('the confirmation that ends a match', () => {
  it('fills the fields with the stand of the goals, in the order of the match, each with a label', () => {
    const { getByLabelText } = render(form({}, false))

    expect((getByLabelText('Doelpunten sc Heerenveen') as HTMLInputElement).value).toBe('2')
    expect((getByLabelText('Doelpunten N.E.C.') as HTMLInputElement).value).toBe('1')
    expect([...document.querySelectorAll('input')].map((one) => one.name)).toEqual(['uitslag-zij', 'uitslag-wij'])
  })

  it('has a fieldset with a legend, a button that names what it does, and a way back', () => {
    const { getByRole } = render(form())

    expect(document.querySelector('fieldset legend')?.textContent).toBe('Eindstand')
    expect(getByRole('button', { name: 'Wedstrijd afgelopen' })).not.toBeNull()
    expect(getByRole('link', { name: 'Annuleren' }).getAttribute('href')).toBe('/beheer/wedstrijden/7/verslag')
  })

  it('shows an error at the field and in a list that gets the focus, with a link to the field', async () => {
    const { getByRole, getByText } = render(form({ errors: { 'uitslag-zij': wrong } }))

    expect(document.getElementById('afgelopen-fouten')).toBeNull()

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Wedstrijd afgelopen' }))
    })

    await waitFor(() => expect(document.activeElement?.id).toBe('afgelopen-fouten'))
    expect(getByText('Er is iets mis')).not.toBeNull()
    expect(document.querySelector('#afgelopen-fouten a')?.getAttribute('href')).toBe('#uitslag-zij')
    expect(input('uitslag-zij').getAttribute('aria-invalid')).toBe('true')
    expect(input('uitslag-wij').getAttribute('aria-invalid')).not.toBe('true')
  })
})
