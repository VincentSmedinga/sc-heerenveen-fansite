// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ClubCountryState } from '#src/app/beheer/kwaliteit/clubs/land/actions'

import { ClubCountryForm } from './ClubCountryForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const countries = [
  { code: 'DE', label: 'Duitsland (DE)' },
  { code: 'NL', label: 'Nederland (NL)' },
]

const show = (action: Parameters<typeof ClubCountryForm>[0]['action'], country: null | string = null) =>
  render(
    <ClubCountryForm
      action={action}
      countries={countries}
      country={country}
      name="Oefenstad FC"
      source="uit Wikidata"
    />,
  )

describe('the form of the country of a club', () => {
  it('has a labelled list with Onbekend first and a button that names the club', () => {
    show(() => Promise.resolve({}), 'NL')

    const list = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Land (niet verplicht)' })

    expect([...list.options].map((option) => option.textContent)).toEqual([
      'Onbekend',
      'Duitsland (DE)',
      'Nederland (NL)',
    ])
    expect(list.value).toBe('NL')
    expect(screen.getByRole('button', { name: 'Opslaan: land van Oefenstad FC' })).toBeTruthy()
    expect(screen.getByText(/Nu: Nederland \(NL\), uit Wikidata/u)).toBeTruthy()
  })

  it('says what was saved, in a status line', async () => {
    const action = vi.fn((_previous: ClubCountryState, formData: FormData) =>
      Promise.resolve({ saved: String(formData.get('land')) }),
    )

    show(action)
    fireEvent.change(screen.getByRole('combobox', { name: 'Land (niet verplicht)' }), { target: { value: 'DE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan: land van Oefenstad FC' }))

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Opgeslagen: Oefenstad FC, Duitsland (DE).'),
    )
    expect(action.mock.calls[0]?.[1].get('land')).toBe('DE')
  })

  it('says so when the country was taken away', async () => {
    show(() => Promise.resolve({ saved: '' }), 'NL')
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan: land van Oefenstad FC' }))

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Opgeslagen: Oefenstad FC heeft geen land meer.'),
    )
  })

  it('shows an error at the list and moves the focus to the list of errors', async () => {
    show(() => Promise.resolve({ error: 'Kies een land uit de lijst.', land: 'XX' }))
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan: land van Oefenstad FC' }))

    await waitFor(() => expect(document.activeElement?.id).toBe('land-fouten'))
    expect(screen.getAllByText('Kies een land uit de lijst.').length).toBeGreaterThan(0)
  })
})
