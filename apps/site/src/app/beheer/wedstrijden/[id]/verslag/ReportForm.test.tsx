// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { emptyRow, emptySide, type ReportFormState, type ReportValues, type Row } from '#src/beheer/report-fields'

import { ReportFields, ReportFormProvider } from './ReportForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const squad = [1, 2, 3, 4, 5].map((id) => ({ id, name: `Speler ${id}`, shirtNumber: id }))
const row = (keuze: string, rol = 'basis'): Row => ({ ...emptyRow('speler'), keuze, rol })

// Players 1 and 2 are in the line-up, player 3 and an empty place are on the bench.
const values: ReportValues = {
  bron: '',
  status: 'bezig',
  tegenstander: 'nee',
  wij: { ...emptySide(), speler: [row('1'), row('2'), row('3', 'bank'), row('', 'bank')] },
  zij: emptySide(),
}
const initial: ReportFormState = { errors: {}, values, version: 0, warnings: {} }

const show = () =>
  render(
    <ReportFormProvider
      action={() => Promise.resolve(initial)}
      choices={{ opponent: 'Testclub', showDelay: 'binnen vijf minuten', squad }}
      initial={initial}
      title="Dit is nog niet af"
    >
      <ReportFields />
    </ReportFormProvider>,
  )

const select = (id: string) => document.getElementById(id) as HTMLSelectElement
const optionsOf = (id: string) => [...select(id).options].map((option) => option.value)
const choose = (id: string, value: string) => fireEvent.change(select(id), { target: { value } })

describe('the places of the line-up and the bench in the form of a report', () => {
  it('gives the places of the bench the players who are not in the line-up', () => {
    show()

    expect(optionsOf('speler-wij-3-keuze')).toEqual(['', '3', '4', '5', 'andere'])
    expect(optionsOf('speler-wij-4-keuze')).toEqual(['', '4', '5', 'andere'])
  })

  it('changes the list of the bench with the line-up: who comes into it leaves the list, who leaves it comes in', () => {
    show()
    choose('speler-wij-1-keuze', '4')

    // Player 4 is in the line-up now, and player 1 is not.
    expect(optionsOf('speler-wij-4-keuze')).toEqual(['', '1', '5', 'andere'])
    expect(optionsOf('speler-wij-3-keuze')).toEqual(['', '1', '3', '5', 'andere'])
  })

  it('empties the place on the bench of a player who is chosen for the line-up, so no place keeps him twice', () => {
    show()
    choose('speler-wij-1-keuze', '3')

    expect(select('speler-wij-1-keuze').value).toBe('3')
    expect(select('speler-wij-3-keuze').value).toBe('')
    // A screen reader is told what the form did by itself.
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      '3 Speler 3 staat nu in de opstelling. Zijn andere plaats in het verslag is leeg gemaakt.',
    )
    // The bench has him no more, the line-up has him once, and player 1 is free again.
    expect(optionsOf('speler-wij-4-keuze')).toEqual(['', '1', '4', '5', 'andere'])
    expect(optionsOf('speler-wij-2-keuze')).toEqual(['', '1', '2', '4', '5', 'andere'])
  })

  it('says nothing when a choice takes nobody from another place', () => {
    show()
    choose('speler-wij-4-keuze', '5')

    expect(document.querySelector('[role="status"]')?.textContent).toBe('')
  })

  it('does not offer a player of the bench in two places of the bench', () => {
    show()
    choose('speler-wij-4-keuze', '5')

    expect(optionsOf('speler-wij-3-keuze')).toEqual(['', '3', '4', 'andere'])
    expect(optionsOf('speler-wij-4-keuze')).toEqual(['', '4', '5', 'andere'])
  })

  it('lets a place of the line-up be changed to the bench, and the list follows the role', () => {
    show()
    choose('speler-wij-2-rol', 'bank')

    // Player 2 is now on the bench: the line-up has only player 1, the places of the line-up
    // can take him, and the bench lists only players who are not in the line-up.
    expect(optionsOf('speler-wij-2-keuze')).toEqual(['', '2', '4', '5', 'andere'])
    expect(optionsOf('speler-wij-4-keuze')).toEqual(['', '4', '5', 'andere'])
  })
})
