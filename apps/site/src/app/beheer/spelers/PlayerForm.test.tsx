// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { emptyPlayerValues, type PlayerFormState } from '#src/beheer/player-fields'

import { PlayerForm } from './PlayerForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const people = [
  { id: 7, label: 'Pelle van Amersfoort (2018/19)' },
  { id: 9, label: 'Piet Amersfoort (2019/20, geen Wikipedia-pagina)' },
]

const show = (answer: PlayerFormState, more: Partial<Parameters<typeof PlayerForm>[0]> = {}) =>
  render(
    <PlayerForm
      action={() => Promise.resolve(answer)}
      cancelHref="/beheer/spelers"
      initial={answer.values}
      submitLabel="Speler toevoegen"
      {...more}
    />,
  )

describe('the form of a player', () => {
  it('has a field for each thing of the player, each with its label', () => {
    show({ errors: {}, values: emptyPlayerValues })

    for (const label of ['Voornaam', 'Tussenvoegsel', 'Achternaam', 'Wikipedia-pagina', 'Rugnummer', 'Positie']) {
      expect(screen.getAllByLabelText(new RegExp(`^${label}`, 'u')).length).toBeGreaterThan(0)
    }

    expect(screen.queryByLabelText(/^Persoon/u)).toBeNull()
    expect((document.getElementById('achternaam') as HTMLInputElement).required).toBe(true)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Onbekend',
      'Doelman',
      'Verdediger',
      'Middenvelder',
      'Aanvaller',
    ])
    expect(screen.getByRole('button', { name: 'Speler toevoegen' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Annuleren' }).getAttribute('href')).toBe('/beheer/spelers')
  })

  it('lists the persons the search found, with a new person as the last choice', () => {
    show({ errors: {}, values: { ...emptyPlayerValues, persoon: '7' } }, { people })

    const list = screen.getByLabelText(/^Persoon/u) as HTMLSelectElement

    expect([...list.options].map((option) => option.textContent)).toEqual([
      'Pelle van Amersfoort (2018/19)',
      'Piet Amersfoort (2019/20, geen Wikipedia-pagina)',
      'Een nieuwe persoon, die hieronder staat',
    ])
    expect(list.value).toBe('7')
    // The name is for a new person only, so the browser must not ask for it.
    expect((document.getElementById('achternaam') as HTMLInputElement).required).toBe(false)
  })

  it('shows an error at its own field and in the list, which gets the focus', async () => {
    show({ errors: { rugnummer: 'Vul een getal van 1 tot en met 99 in.' }, values: emptyPlayerValues })
    fireEvent.click(screen.getByRole('button', { name: 'Speler toevoegen' }))

    await waitFor(() => expect(document.activeElement?.id).toBe('fouten'))
    expect(screen.getAllByText('Vul een getal van 1 tot en met 99 in.').length).toBeGreaterThan(1)
    expect(document.getElementById('rugnummer')?.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById('rugnummer')?.getAttribute('aria-invalid')).toBe('true')
  })

  it('gives the focus to the list for an error that belongs to no field', async () => {
    show({ errors: { algemeen: 'De speler is niet opgeslagen. Probeer het nog eens.' }, values: emptyPlayerValues })
    fireEvent.click(screen.getByRole('button', { name: 'Speler toevoegen' }))

    await waitFor(() => expect(document.activeElement?.id).toBe('fouten'))
    expect(screen.getByText('De speler is niet opgeslagen. Probeer het nog eens.')).toBeTruthy()
  })

  it('puts the values of the answer back in the fields', async () => {
    show({ errors: { achternaam: 'Vul de achternaam in.' }, values: { ...emptyPlayerValues, voornaam: 'Pelle' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speler toevoegen' }))

    await waitFor(() => expect((document.getElementById('voornaam') as HTMLInputElement).value).toBe('Pelle'))
  })
})
