// @vitest-environment jsdom
import { formationChoices } from '@fansite/shared/match-report'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import {
  emptyRow,
  emptySide,
  noFormation,
  type ReportFormState,
  type ReportValues,
  type Row,
} from '#src/beheer/report-fields'

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
  formatie: { wij: noFormation(), zij: noFormation() },
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

describe('the formation in the form of a report', () => {
  const withFormation = (
    wij: { eigen: string; keuze: string },
    errors: ReportFormState['errors'] = {},
  ): ReportFormState => ({ ...initial, errors, values: { ...values, formatie: { wij, zij: noFormation() } } })
  const showWith = (state: ReportFormState) =>
    render(
      <ReportFormProvider
        action={() => Promise.resolve(state)}
        choices={{ opponent: 'Testclub', showDelay: 'binnen vijf minuten', squad }}
        initial={state}
        title="Dit is nog niet af"
      >
        <ReportFields />
      </ReportFormProvider>,
    )
  const ownField = (side: string) =>
    document.getElementById(`formatie-${side}-eigen`)?.closest('.hf-field') as HTMLElement

  it('has a list for each team with no formation, the usual ones and Anders, with a label', () => {
    showWith(initial)

    for (const side of ['wij', 'zij']) {
      expect(optionsOf(`formatie-${side}`)).toEqual(['', ...formationChoices, 'anders'])
      expect(select(`formatie-${side}`).name).toBe(`formatie-${side}`)
    }

    expect(document.querySelector('label[for="formatie-wij"]')?.textContent).toBe('Formatie van sc Heerenveen')
    expect(document.querySelector('label[for="formatie-zij"]')?.textContent).toBe('Formatie van Testclub')
    expect(select('formatie-wij').value).toBe('')
  })

  it('shows the formation that was chosen, and the formation of his own in Anders with its text', () => {
    showWith(withFormation({ eigen: '', keuze: '4-3-3' }))
    expect(select('formatie-wij').value).toBe('4-3-3')
    cleanup()

    showWith(withFormation({ eigen: '4-1-2-1-2', keuze: 'anders' }))
    expect(select('formatie-wij').value).toBe('anders')
    expect((document.getElementById('formatie-wij-eigen') as HTMLInputElement).value).toBe('4-1-2-1-2')
  })

  it('has a field for a formation of his own, with a label, an explanation and a name of its own', () => {
    showWith(initial)

    const input = document.getElementById('formatie-wij-eigen') as HTMLInputElement

    expect(input.name).toBe('formatie-wij-eigen')
    expect(document.querySelector('label[for="formatie-wij-eigen"]')?.textContent).toBe(
      'Eigen formatie van sc Heerenveen',
    )
    expect(input.getAttribute('aria-describedby')).toBe('formatie-wij-eigen-hint')
    expect(document.getElementById('formatie-wij-eigen-hint')?.textContent).toContain('zoals 4-1-2-1-2')
    expect(document.getElementById('formatie-wij-eigen-hint')?.textContent).toContain('Samen zijn het er tien')
  })

  it('shows the field of his own with the choice Anders only, and keeps the text when he changes his mind', () => {
    showWith(initial)

    expect(ownField('wij').hidden).toBe(true)
    choose('formatie-wij', 'anders')
    expect(ownField('wij').hidden).toBe(false)
    choose('formatie-wij', '4-3-3')
    expect(ownField('wij').hidden).toBe(true)
    expect(ownField('zij').hidden).toBe(true)
  })

  it('shows the field of his own before the page is live, so a page without JavaScript can use it', () => {
    const html = renderToStaticMarkup(
      <ReportFormProvider
        action={() => Promise.resolve(initial)}
        choices={{ opponent: 'Testclub', showDelay: 'binnen vijf minuten', squad }}
        initial={initial}
        title="Dit is nog niet af"
      >
        <ReportFields />
      </ReportFormProvider>,
    )
    const field = /<div class="hf-field"[^>]*>(?:(?!<div class="hf-field").)*?id="formatie-wij-eigen"/su.exec(html)?.[0]

    expect(field).toBeDefined()
    expect(field).not.toContain('hidden')
  })

  it('gives each of the two fields its own error, tied to the field and in words', () => {
    showWith(
      withFormation(
        { eigen: '4-3-4', keuze: 'anders' },
        {
          'formatie-wij': 'Formatie van sc Heerenveen: Kies een formatie uit de lijst, Anders, of niets.',
          'formatie-wij-eigen': 'Formatie van sc Heerenveen: De getallen van de formatie tellen op tot 11.',
        },
      ),
    )

    expect(document.getElementById('formatie-wij-error')?.textContent).toContain('Kies een formatie uit de lijst')
    expect(document.getElementById('formatie-wij-eigen-error')?.textContent).toContain('tellen op tot 11')
    expect(document.getElementById('formatie-wij-eigen')?.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById('formatie-wij-eigen')?.getAttribute('aria-describedby')).toBe(
      'formatie-wij-eigen-hint formatie-wij-eigen-error',
    )
  })

  it('puts the formation in the card of the line-up of its team, above the table', () => {
    showWith(initial)

    const card = document.getElementById('formatie-wij')?.closest('section')

    expect(card?.getAttribute('aria-labelledby')).toBe('speler-wij')
    expect(card?.querySelector('table')).not.toBeNull()
    expect(card?.querySelector('#formatie-wij')?.compareDocumentPosition(card.querySelector('table')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })
})
