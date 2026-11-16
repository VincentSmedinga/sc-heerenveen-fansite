// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { HomeGroundFormState, HomeGroundRowValues } from '#src/beheer/home-ground-fields'

import { HomeGroundsForm } from './HomeGroundsForm'

afterEach(() => {
  cleanup()
})

const stadiums = [
  { id: 1, label: 'Oud Veld (Oefenstad)' },
  { id: 2, label: 'Nieuw Veld (Oefenstad)' },
]
const rows: HomeGroundRowValues[] = [
  { dag: '', seizoen: '', stadion: '1', toelichting: '' },
  { dag: '', seizoen: '2005/06', stadion: '2', toelichting: '' },
]

const show = (answer?: HomeGroundFormState) =>
  render(
    <HomeGroundsForm
      action={() => Promise.resolve(answer ?? { errors: {}, values: rows })}
      clubName="Oefenstad AZ"
      initial={rows}
      stadiums={stadiums}
    />,
  )

describe('the form of the home grounds of a club', () => {
  it('names the buttons and the fields of each line with its number and its stadium', () => {
    show()

    expect(screen.getByRole('button', { name: /Thuisveld 1: Oud Veld \(Oefenstad\) weghalen/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Thuisveld 2: Nieuw Veld \(Oefenstad\) weghalen/ })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /Stadion, thuisveld 2/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thuisveld toevoegen' })).toBeTruthy()
  })

  it('offers the stadiums to choose from, and no new one made in the line', () => {
    show()

    const options = within(screen.getByRole('combobox', { name: /Stadion, thuisveld 1/ })).getAllByRole('option')

    expect(options.map((option) => option.textContent)).toEqual([
      'Kies een stadion',
      'Oud Veld (Oefenstad)',
      'Nieuw Veld (Oefenstad)',
    ])
  })

  it('puts the focus on the list of errors, which links to the field of the line with the error', async () => {
    const { container } = show({ errors: { 'thuis-1-stadion': 'Kies een stadion uit de lijst.' }, values: rows })

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    const link = await screen.findByRole('link', { name: /Kies een stadion uit de lijst/ })

    expect(link.getAttribute('href')).toBe('#thuis-1-stadion')
    await waitFor(() => expect(document.activeElement?.id).toBe('thuisvelden-fouten'))
  })
})
