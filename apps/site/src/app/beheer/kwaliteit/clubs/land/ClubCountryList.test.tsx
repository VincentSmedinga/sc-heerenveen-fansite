// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ClubCountryState } from './actions'

import { ClubCountryList } from './ClubCountryList'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const rows = [
  { europe: true, name: 'Europese Club', slug: 'europese-club' },
  { europe: false, name: 'Thuisclub', slug: 'thuisclub' },
  { europe: false, name: 'Derde FC', slug: 'derde-fc' },
]
const countries = [
  { code: 'DE', label: 'Duitsland (DE)' },
  { code: 'NL', label: 'Nederland (NL)' },
]

type Action = Parameters<typeof ClubCountryList>[0]['action']

const saves: Action = (_slug, _previous, formData) =>
  Promise.resolve({ saved: String(formData.get('land')) } satisfies ClubCountryState)

const show = (action: Action) =>
  render(
    <ClubCountryList
      action={action}
      countries={countries}
      path="/beheer/kwaliteit/clubs/land"
      rows={rows}
      totals={{ europe: 5, total: 20 }}
    />,
  )

const names = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('the work list of clubs without a country', () => {
  it('says how many clubs are left and how many played in Europe', () => {
    show(saves)

    expect(screen.getByRole('status').textContent).toBe('Nog 20 clubs zonder land, 5 van wedstrijden in Europa.')
    expect(names()).toEqual(['Europese Club', 'Thuisclub', 'Derde FC'])
  })

  it('gives each list and each button the name of its club', () => {
    show(saves)

    for (const { name } of rows) {
      const card = screen.getByRole('region', { name })

      expect(within(card).getByRole('combobox', { name: `Land van ${name}` })).toBeTruthy()
      expect(within(card).getByRole('button', { name: `Sla op: land van ${name}` })).toBeTruthy()
    }
  })

  it('saves one club, takes it out, counts it and moves the focus to the next club', async () => {
    const action = vi.fn(saves)

    show(action)
    fireEvent.change(screen.getByRole('combobox', { name: 'Land van Europese Club' }), { target: { value: 'DE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sla op: land van Europese Club' }))

    await waitFor(() => expect(names()).toEqual(['Thuisclub', 'Derde FC']))
    expect(action.mock.calls[0]?.[0]).toBe('europese-club')
    expect(action.mock.calls[0]?.[2].get('land')).toBe('DE')
    expect(screen.getByRole('status').textContent).toBe(
      'Opgeslagen: Europese Club, Duitsland (DE). Nog 19 clubs zonder land, 4 van wedstrijden in Europa.',
    )
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Thuisclub'))
  })

  it('puts an error at its own club with the focus on it, and leaves the others alone', async () => {
    show((slug, _previous, formData) =>
      Promise.resolve(
        slug === 'thuisclub'
          ? { error: 'Kies een land uit de lijst.', land: '' }
          : ({ saved: String(formData.get('land')) } satisfies ClubCountryState),
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sla op: land van Thuisclub' }))

    const card = screen.getByRole('region', { name: 'Thuisclub' })

    await waitFor(() =>
      expect(within(card).getByText('Kies een land uit de lijst.', { selector: 'li a' })).toBeTruthy(),
    )
    expect(document.activeElement?.id).toBe('club-thuisclub-fouten')
    expect(names()).toEqual(['Europese Club', 'Thuisclub', 'Derde FC'])
  })

  it('has nothing to do when every club has a country', () => {
    render(
      <ClubCountryList
        action={saves}
        countries={countries}
        path="/beheer/kwaliteit/clubs/land"
        rows={[]}
        totals={{ europe: 0, total: 0 }}
      />,
    )

    expect(screen.getByRole('status').textContent).toBe('Er is niets meer te doen: elke club heeft een land.')
  })
})
