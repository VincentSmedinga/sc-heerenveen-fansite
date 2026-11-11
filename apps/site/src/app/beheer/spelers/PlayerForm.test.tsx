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

const countries = [
  { code: 'DK', label: 'Denemarken (DK)' },
  { code: 'NL', label: 'Nederland (NL)' },
]

const show = (answer: PlayerFormState, more: Partial<Parameters<typeof PlayerForm>[0]> = {}) =>
  render(
    <PlayerForm
      action={() => Promise.resolve(answer)}
      cancelHref="/beheer/spelers"
      countries={countries}
      initial={answer.values}
      submitLabel="Speler toevoegen"
      {...more}
    />,
  )

describe('the form of a player', () => {
  it('turns the correction of the browser off in the name fields and the Wikipedia field, and the capital in the prefix', () => {
    show({ errors: {}, values: emptyPlayerValues })

    const field = (name: string) => document.querySelector(`[name="${name}"]`)

    for (const name of ['voornaam', 'tussenvoegsel', 'achternaam', 'wikipedia']) {
      expect(field(name)?.getAttribute('autocorrect')).toBe('off')
    }

    expect(field('tussenvoegsel')?.getAttribute('autocapitalize')).toBe('off')
  })

  it('has a field for each thing of the player, each with its label', () => {
    show({ errors: {}, values: emptyPlayerValues })

    for (const label of [
      'Voornaam',
      'Tussenvoegsel',
      'Achternaam',
      'Wikipedia-pagina',
      'Linie',
      'Land',
      'Rugnummer',
      'Vorig rugnummer',
      'Nieuw nummer vanaf',
      'Positie',
    ]) {
      expect(screen.getAllByLabelText(new RegExp(`^${label}`, 'u')).length).toBeGreaterThan(0)
    }

    expect(screen.queryByLabelText(/^Persoon/u)).toBeNull()
    expect((document.getElementById('achternaam') as HTMLInputElement).required).toBe(true)
    const lines = ['Onbekend', 'Doelman', 'Verdediger', 'Middenvelder', 'Aanvaller']
    const options = (id: string) =>
      [...(document.getElementById(id) as HTMLSelectElement).options].map((option) => option.textContent)

    expect(options('positie')).toEqual(lines)
    // The line and the country of the person each have an empty choice, and the country is a
    // list by name with the code.
    expect(options('linie')).toEqual(lines)
    expect(options('land')).toEqual(['Onbekend', 'Denemarken (DK)', 'Nederland (NL)'])
    expect((document.getElementById('land') as HTMLSelectElement).options[2]?.value).toBe('NL')
    expect(screen.getByRole('button', { name: 'Speler toevoegen' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Annuleren' }).getAttribute('href')).toBe('/beheer/spelers')
  })

  it('shows an error at the field of the previous number and at the field of the day, each with its own text', async () => {
    show({
      errors: { rugnummervanaf: 'Vul in vanaf welke dag het rugnummer geldt.', vorigrugnummer: 'Vul het nummer in.' },
      values: emptyPlayerValues,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Speler toevoegen' }))
    await waitFor(() => expect(document.activeElement?.id).toBe('fouten'))

    for (const id of ['vorigrugnummer', 'rugnummervanaf']) {
      expect(document.getElementById(id)?.getAttribute('aria-invalid')).toBe('true')
    }

    expect(document.getElementById('rugnummervanaf')?.getAttribute('type')).toBe('date')
    expect(screen.getAllByText('Vul in vanaf welke dag het rugnummer geldt.').length).toBeGreaterThan(0)
  })

  it('starts with the number the chosen person had the season before, and follows the choice (#1076)', () => {
    const withNumbers = [
      { id: 7, label: 'Pelle van Amersfoort (2018/19)', suggestion: { number: 21, season: '2018/19' } },
      { id: 9, label: 'Piet Amersfoort (2019/20)', suggestion: { number: 4, season: '2018/19' } },
      { id: 11, label: 'Jan Zonder (2018/19)' },
    ]

    show({ errors: {}, values: { ...emptyPlayerValues, persoon: '7', rugnummer: '21' } }, { people: withNumbers })

    const number = document.getElementById('rugnummer') as HTMLInputElement
    const choose = (value: string) =>
      fireEvent.change(document.getElementById('persoon') as HTMLSelectElement, { target: { value } })

    expect(number.value).toBe('21')
    expect(screen.getByText(/Rugnummer in 2018\/19\./u)).toBeTruthy()
    choose('9')
    expect(number.value).toBe('4')
    choose('11')
    expect(number.value).toBe('')
    expect(screen.queryByText(/Rugnummer in 2018\/19\./u)).toBeNull()
  })

  it('keeps a number the editor typed when he chooses another person', () => {
    const withNumbers = [
      { id: 7, label: 'Pelle van Amersfoort (2018/19)', suggestion: { number: 21, season: '2018/19' } },
      { id: 9, label: 'Piet Amersfoort (2019/20)', suggestion: { number: 4, season: '2018/19' } },
    ]

    show({ errors: {}, values: { ...emptyPlayerValues, persoon: '7', rugnummer: '21' } }, { people: withNumbers })

    const number = document.getElementById('rugnummer') as HTMLInputElement

    fireEvent.change(number, { target: { value: '33' } })
    fireEvent.change(document.getElementById('persoon') as HTMLSelectElement, { target: { value: '9' } })
    expect(number.value).toBe('33')
  })

  it('opens with the line and the country of the person, and says what they are for', () => {
    show({ errors: {}, values: { ...emptyPlayerValues, land: 'NL', linie: 'verdediger' } })

    expect((screen.getByLabelText(/^Linie/u) as HTMLSelectElement).value).toBe('verdediger')
    expect((screen.getByLabelText(/^Land/u) as HTMLSelectElement).value).toBe('NL')
    expect(screen.getByText('De linie van deze persoon, in elk seizoen.')).toBeTruthy()
    expect(screen.getByText('Alleen voor dit seizoen. Bij Onbekend geldt de linie van de persoon.')).toBeTruthy()
  })

  it('has no line and no country for a player without a person', () => {
    show({ errors: {}, values: emptyPlayerValues }, { withoutPerson: true })

    expect(screen.queryByLabelText(/^Linie/u)).toBeNull()
    expect(screen.queryByLabelText(/^Land/u)).toBeNull()
    expect(screen.getByLabelText(/^Positie/u)).toBeTruthy()
  })

  it('shows an error of the line and of the country each at its own field', async () => {
    show({
      errors: {
        land: 'Kies een land uit de lijst, of kies Onbekend.',
        linie: 'Kies een linie uit de lijst, of kies Onbekend.',
      },
      values: emptyPlayerValues,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Speler toevoegen' }))

    await waitFor(() => expect(document.activeElement?.id).toBe('fouten'))

    for (const id of ['linie', 'land']) {
      expect(document.getElementById(id)?.getAttribute('aria-invalid')).toBe('true')
      expect(document.getElementById(id)?.getAttribute('aria-describedby')).toBeTruthy()
    }

    expect(
      screen.getByRole('link', { name: 'Kies een land uit de lijst, of kies Onbekend.' }).getAttribute('href'),
    ).toBe('#land')
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
    // The link in the list leads to the line of the error itself.
    expect(
      screen.getByRole('link', { name: 'De speler is niet opgeslagen. Probeer het nog eens.' }).getAttribute('href'),
    ).toBe('#algemeen')
    expect(document.getElementById('algemeen')?.textContent).toContain('De speler is niet opgeslagen.')
  })

  it('puts the values of the answer back in the fields', async () => {
    show({ errors: { achternaam: 'Vul de achternaam in.' }, values: { ...emptyPlayerValues, voornaam: 'Pelle' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speler toevoegen' }))

    await waitFor(() => expect((document.getElementById('voornaam') as HTMLInputElement).value).toBe('Pelle'))
  })

  it('has the link to the page that merges two persons under the field of the page it refused', async () => {
    show(
      {
        errors: { wikipedia: 'Deze pagina hoort bij een andere persoon: Nieuwe Naam.' },
        merge: {
          href: '/beheer/spelers/samenvoegen?met=2&persoon=1&speler=3',
          label: 'Voeg Oude Naam samen met Nieuwe Naam',
        },
        values: emptyPlayerValues,
      },
      { submitLabel: 'Opslaan' },
    )
    expect(screen.queryByRole('link', { name: /samen met/u })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }))

    const link = await screen.findByRole('link', { name: 'Voeg Oude Naam samen met Nieuwe Naam' })

    expect(link.getAttribute('href')).toBe('/beheer/spelers/samenvoegen?met=2&persoon=1&speler=3')
    expect(document.getElementById('wikipedia')?.getAttribute('aria-invalid')).toBe('true')
    // The link comes after the field, before the next one.
    expect(
      document.getElementById('wikipedia')!.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('says what a Wikipedia page does for a player with a person, and for one without', () => {
    const { unmount } = show({ errors: {}, values: emptyPlayerValues })

    expect(screen.getByText(/Die krijgt de pagina alleen als de pagina nog bij niemand hoort/u)).toBeTruthy()
    expect(screen.getByText(/Voeg de twee personen dan samen, onder Dezelfde persoon als/u)).toBeTruthy()
    unmount()
    show({ errors: {}, values: emptyPlayerValues }, { withoutPerson: true })
    expect(screen.getByText(/Hoort de pagina al bij een persoon, dan wordt de speler die persoon/u)).toBeTruthy()
    expect(screen.queryByText(/Dezelfde persoon als/u)).toBeNull()
  })
})
