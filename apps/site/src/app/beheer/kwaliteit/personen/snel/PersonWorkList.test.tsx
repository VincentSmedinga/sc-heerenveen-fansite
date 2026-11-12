// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PersonFactState } from './actions'

import { PersonWorkList } from './PersonWorkList'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const rows = [
  { id: 1, name: 'Verzonnen Spits', seasons: '2003/04', wikipedia: 'https://nl.wikipedia.org/wiki/Verzonnen_Spits' },
  { id: 2, name: 'Bedachte Back', seasons: '2001/02 tot en met 2003/04' },
  { id: 3, name: 'Test Zonder Selectie' },
]

const countries = {
  others: [{ code: 'AD', label: 'Andorra (AD)' }],
  ours: [
    { code: 'DK', label: 'Denemarken (DK)' },
    { code: 'NL', label: 'Nederland (NL)' },
  ],
}

const paths = { land: '/beheer/kwaliteit/personen/snel?lijst=land', linie: '/beheer/kwaliteit/personen/snel' }

type Action = Parameters<typeof PersonWorkList>[0]['action']

const show = (fact: 'land' | 'linie', action: Action, more: Partial<Parameters<typeof PersonWorkList>[0]> = {}) =>
  render(
    <PersonWorkList
      action={action}
      countries={countries}
      fact={fact}
      paths={paths}
      rows={rows}
      totals={{ land: 44, linie: 79 }}
      {...more}
    />,
  )

const saves: Action = (_id, fact, _previous, formData) =>
  Promise.resolve({ saved: String(formData.get(fact)) } satisfies PersonFactState)

const names = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('the work list of persons without a line', () => {
  it('says how many are left and shows each person with the seasons and the article', () => {
    show('linie', saves)

    expect(screen.getByRole('status').textContent).toBe('Nog 79 personen zonder linie.')
    expect(names()).toEqual(['Verzonnen Spits', 'Bedachte Back', 'Test Zonder Selectie'])

    const first = screen.getByRole('region', { name: 'Verzonnen Spits' })

    expect(first.textContent).toContain('2003/04')
    expect(within(first).getByRole('link', { name: 'Wikipedia over Verzonnen Spits' }).getAttribute('href')).toBe(
      'https://nl.wikipedia.org/wiki/Verzonnen_Spits',
    )
    expect(screen.getByRole('region', { name: 'Test Zonder Selectie' }).textContent).toContain('In geen selectie')
    expect(within(screen.getByRole('region', { name: 'Bedachte Back' })).queryByRole('link')).toBeNull()
  })

  it('has the two lists as links, with the one that is shown marked', () => {
    show('linie', saves)

    const filter = screen.getByRole('navigation', { name: 'Kies een lijst' })

    expect(within(filter).getByRole('link', { name: 'Zonder linie (79)' }).getAttribute('aria-current')).toBe('page')
    expect(within(filter).getByRole('link', { name: 'Zonder land (44)' }).getAttribute('href')).toBe(paths.land)
  })

  it('names the person in each of the four buttons and in the button that skips', () => {
    show('linie', saves)

    for (const { name } of rows) {
      for (const line of ['Doelman', 'Verdediger', 'Middenvelder', 'Aanvaller']) {
        expect(screen.getByRole('button', { name: `${line} voor ${name}` }).textContent).toBe(line)
      }

      expect(screen.getByRole('button', { name: `Sla over: ${name}` })).toBeTruthy()
    }
  })

  it('saves the row that was chosen, takes it out and moves the focus to the next person', async () => {
    const action = vi.fn(saves)

    show('linie', action)
    fireEvent.click(screen.getByRole('button', { name: 'Verdediger voor Verzonnen Spits' }))

    await waitFor(() => expect(names()).toEqual(['Bedachte Back', 'Test Zonder Selectie']))
    expect(action.mock.calls[0]?.slice(0, 2)).toEqual([1, 'linie'])
    expect(action.mock.calls[0]?.[3].get('linie')).toBe('verdediger')
    expect(screen.getByRole('status').textContent).toBe(
      'Opgeslagen: Verzonnen Spits, verdediger. Nog 78 personen zonder linie.',
    )
    expect(screen.getByRole('link', { name: 'Zonder linie (78)' })).toBeTruthy()
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Bedachte Back'))
  })

  it('puts an error at its own row with the focus on it, and leaves the other rows alone', async () => {
    show('linie', (id, fact, _previous, formData) =>
      Promise.resolve(
        id === 2 ? { error: 'Bedachte Back heeft al een linie.' } : { saved: String(formData.get(fact)) },
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Doelman voor Bedachte Back' }))

    const row = screen.getByRole('region', { name: 'Bedachte Back' })
    const summary = await within(row).findByRole('region', { name: 'Er is iets mis' })

    expect(summary.textContent).toContain('Bedachte Back heeft al een linie.')
    await waitFor(() => expect(document.activeElement).toBe(summary))
    expect(within(summary).getByRole('link').getAttribute('href')).toBe('#persoon-2-linie')
    expect(screen.getByRole('button', { name: 'Doelman voor Bedachte Back' }).id).toBe('persoon-2-linie')
    expect(names()).toEqual(['Verzonnen Spits', 'Bedachte Back', 'Test Zonder Selectie'])
    expect(screen.getByRole('status').textContent).toBe('Nog 79 personen zonder linie.')
    expect(within(screen.getByRole('region', { name: 'Verzonnen Spits' })).queryByRole('region')).toBeNull()
  })

  it('puts a person who is skipped at the end, with the focus on the next one', () => {
    show('linie', saves)
    fireEvent.click(screen.getByRole('button', { name: 'Sla over: Verzonnen Spits' }))

    expect(names()).toEqual(['Bedachte Back', 'Test Zonder Selectie', 'Verzonnen Spits'])
    expect(screen.getByRole('status').textContent).toBe(
      'Verzonnen Spits staat nu onderaan de lijst. Nog 79 personen zonder linie.',
    )
    expect(document.activeElement?.textContent).toBe('Bedachte Back')
  })

  it('says that nothing is left, and offers the next part when the part is done', async () => {
    const { unmount } = show('linie', saves, { rows: [], totals: { land: 44, linie: 0 } })

    expect(screen.getByRole('status').textContent).toBe('Er is niets meer te doen: elke persoon heeft een linie.')
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
    unmount()

    show('linie', saves, { rows: rows.slice(0, 1) })
    // One row is left, so there is nothing to put it behind.
    expect(screen.queryByRole('button', { name: /^Sla over/u })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Aanvaller voor Verzonnen Spits' }))

    const link = await screen.findByRole('link', { name: 'Toon de volgende personen' })

    expect(link.getAttribute('href')).toBe(paths.linie)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('status')))
  })
})

describe('the work list of persons without a country', () => {
  const select = (name: string) => screen.getByRole('combobox', { name: `Land van ${name}` }) as HTMLSelectElement

  it('has a list of countries for each person, with those of our persons first', () => {
    show('land', saves)

    expect(screen.getByRole('status').textContent).toBe('Nog 44 personen zonder land.')
    expect([...select('Bedachte Back').options].map((option) => option.textContent)).toEqual([
      'Kies een land',
      'Denemarken (DK)',
      'Nederland (NL)',
      'Andorra (AD)',
    ])
    expect(
      within(screen.getByRole('region', { name: 'Bedachte Back' }))
        .getAllByRole('group')
        .map((group) => group.getAttribute('label')),
    ).toEqual(['Landen van onze spelers', 'Andere landen'])
    expect(screen.getByRole('button', { name: 'Sla op: land van Bedachte Back' }).textContent).toBe('Sla op')
  })

  it('saves the country of one row and keeps what was chosen in another', async () => {
    const action = vi.fn(saves)

    show('land', action)
    fireEvent.change(select('Bedachte Back'), { target: { value: 'NL' } })
    fireEvent.change(select('Verzonnen Spits'), { target: { value: 'DK' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sla op: land van Verzonnen Spits' }))

    await waitFor(() => expect(names()).toEqual(['Bedachte Back', 'Test Zonder Selectie']))
    expect(action.mock.calls[0]?.[3].get('land')).toBe('DK')
    expect(screen.getByRole('status').textContent).toBe(
      'Opgeslagen: Verzonnen Spits, Denemarken (DK). Nog 43 personen zonder land.',
    )
    expect(select('Bedachte Back').value).toBe('NL')
  })

  it('shows an error at the list of the row, which keeps the choice, and at no other', async () => {
    show('land', (_id, _fact, _previous, formData) =>
      Promise.resolve({ error: 'Kies een land uit de lijst.', land: String(formData.get('land')) }),
    )
    fireEvent.change(select('Bedachte Back'), { target: { value: 'NL' } })
    fireEvent.change(select('Verzonnen Spits'), { target: { value: 'DK' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sla op: land van Verzonnen Spits' }))

    const summary = await screen.findByRole('region', { name: 'Er is iets mis' })

    await waitFor(() => expect(document.activeElement).toBe(summary))
    expect(within(summary).getByRole('link').getAttribute('href')).toBe(`#${select('Verzonnen Spits').id}`)
    expect(select('Verzonnen Spits').getAttribute('aria-invalid')).toBe('true')
    expect(select('Verzonnen Spits').value).toBe('DK')
    expect(select('Bedachte Back').value).toBe('NL')
    expect(select('Bedachte Back').getAttribute('aria-invalid')).not.toBe('true')
  })
})
