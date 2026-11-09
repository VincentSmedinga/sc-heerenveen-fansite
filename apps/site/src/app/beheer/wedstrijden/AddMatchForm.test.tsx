// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { type AddFormState, emptyAddValues } from '#src/beheer/match-add-fields'

import { AddMatchForm } from './AddMatchForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const choices = {
  clubs: [{ id: 7, name: 'FC Groningen' }],
  competitions: ['Eredivisie', 'KNVB Beker'],
  statuses: [{ label: 'Gespeeld', value: 'played' }],
}

const show = (answer: AddFormState) => render(<AddMatchForm action={() => Promise.resolve(answer)} choices={choices} />)

describe('the form that adds a match', () => {
  it('has a field for each thing the match needs, each with its label', () => {
    show({ errors: {}, values: emptyAddValues })

    for (const label of ['Seizoen', 'Competitie', 'Ronde', 'Tegenstander', 'Datum', 'Status', 'Bron']) {
      expect(screen.getAllByLabelText(new RegExp(`^${label}`, 'u')).length).toBeGreaterThan(0)
    }
    expect(screen.getByRole('radio', { name: 'Thuis' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Uit' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Wedstrijd toevoegen' })).toBeTruthy()
  })

  it('shows an error at its own field and in the list, which gets the focus', async () => {
    show({ errors: { bron: 'Vul de bron in.' }, values: emptyAddValues })
    fireEvent.click(screen.getByRole('button', { name: 'Wedstrijd toevoegen' }))

    await waitFor(() => expect(document.activeElement?.id).toBe('fouten'))
    expect(screen.getAllByText('Vul de bron in.').length).toBeGreaterThan(1)
    expect(document.getElementById('bron')?.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('gives an error without a field the focus too, in the list', async () => {
    show({ errors: { algemeen: 'De wedstrijd is niet opgeslagen.' }, values: emptyAddValues })
    fireEvent.click(screen.getByRole('button', { name: 'Wedstrijd toevoegen' }))

    await waitFor(() => expect(document.activeElement?.id).toBe('fouten'))
    expect(screen.getByText('De wedstrijd is niet opgeslagen.')).toBeTruthy()
  })
})
