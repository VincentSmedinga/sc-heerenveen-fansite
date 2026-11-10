// @vitest-environment jsdom
import { formationChoices } from '@fansite/shared/match-report'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { saveDraft } from '#src/beheer/report-draft'
import {
  emptyRow,
  emptySide,
  noFormation,
  type ReportFormState,
  type ReportValues,
  type Row,
} from '#src/beheer/report-fields'

import { ReportDraftNotice, ReportFields, ReportFormProvider } from './ReportForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
  localStorage.clear()
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
      choices={{
        matchHref: '/beheer/wedstrijden/7',
        opponent: 'Testclub',
        series: null,
        showDelay: 'binnen vijf minuten',
        squad,
      }}
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
        choices={{
          matchHref: '/beheer/wedstrijden/7',
          opponent: 'Testclub',
          series: null,
          showDelay: 'binnen vijf minuten',
          squad,
        }}
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
        choices={{
          matchHref: '/beheer/wedstrijden/7',
          opponent: 'Testclub',
          series: null,
          showDelay: 'binnen vijf minuten',
          squad,
        }}
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

describe('the list Erin of a substitution in the form of a report', () => {
  const named = (naam: string, rol: string): Row => ({ ...emptyRow('speler'), naam, rol })
  const substitution = (): Row => emptyRow('wissel')
  // Ours: players 1 and 2 in the line-up and player 3 on the bench. Theirs: typed names, two in
  // the line-up and two on the bench. Each team has one substitution to fill in.
  const withSubstitutions: ReportFormState = {
    ...initial,
    values: {
      ...values,
      wij: { ...values.wij, speler: [row('1'), row('2'), row('3', 'bank')], wissel: [substitution()] },
      zij: {
        ...emptySide(),
        speler: [
          named('Aanvaller', 'basis'),
          named('Keeper', 'aanvoerder'),
          named('Invaller', 'bank'),
          named('Reserve', 'bank'),
        ],
        wissel: [substitution()],
      },
    },
  }
  const props = {
    choices: {
      matchHref: '/beheer/wedstrijden/7',
      opponent: 'Testclub',
      series: null,
      showDelay: 'binnen vijf minuten',
      squad,
    },
    title: 'Dit is nog niet af',
  }
  const showWith = (state: ReportFormState) =>
    render(
      <ReportFormProvider action={() => Promise.resolve(state)} initial={state} {...props}>
        <ReportFields />
      </ReportFormProvider>,
    )
  const labelsOf = (id: string) => [...select(id).options].map((option) => option.text)
  const withoutBench = (state: ReportFormState): ReportFormState => ({
    ...state,
    values: {
      ...state.values,
      wij: { ...state.values.wij, speler: [row('1'), row('2'), row('', 'bank')] },
      zij: { ...state.values.zij, speler: [named('Aanvaller', 'basis'), named('', 'bank')] },
    },
  })

  it('lists the players with the role Bank of each team, ours by the squad and theirs by the typed name', () => {
    showWith(withSubstitutions)

    expect(labelsOf('wissel-wij-1-erin')).toEqual(['Kies een speler', '3 Speler 3'])
    expect(labelsOf('wissel-zij-1-erin')).toEqual(['Kies een speler', 'Invaller', 'Reserve'])
    expect(optionsOf('wissel-zij-1-erin')).toEqual(['', '3', '4'])
  })

  it('lists them without JavaScript too, as the server makes the page', () => {
    const html = renderToStaticMarkup(
      <ReportFormProvider action={() => Promise.resolve(withSubstitutions)} initial={withSubstitutions} {...props}>
        <ReportFields />
      </ReportFormProvider>,
    )
    const optionsIn = (id: string) =>
      [
        ...(new RegExp(`<select[^>]*id="${id}"[^>]*>(.*?)</select>`, 's').exec(html)?.[1] ?? '').matchAll(
          /<option value="([^"]*)"/g,
        ),
      ].map(([, value]) => value)

    expect(optionsIn('wissel-wij-1-erin')).toEqual(['', '3'])
    expect(optionsIn('wissel-zij-1-erin')).toEqual(['', '3', '4'])
    expect(html).not.toContain('de lijst Erin is leeg')
  })

  it('fills the list as the bench is filled in, for each team, before anything is saved', () => {
    showWith(withoutBench(withSubstitutions))
    expect(labelsOf('wissel-wij-1-erin')).toEqual(['Niemand op de bank'])
    expect(labelsOf('wissel-zij-1-erin')).toEqual(['Niemand op de bank'])

    choose('speler-wij-3-keuze', '4')
    fireEvent.change(document.getElementById('speler-zij-2-naam') as HTMLInputElement, {
      target: { value: 'Invaller' },
    })

    expect(labelsOf('wissel-wij-1-erin')).toEqual(['Kies een speler', '4 Speler 4'])
    expect(labelsOf('wissel-zij-1-erin')).toEqual(['Kies een speler', 'Invaller'])
  })

  it('follows a role that changes to Bank, and leaves the line-up out', () => {
    showWith(withoutBench(withSubstitutions))
    choose('speler-wij-2-rol', 'bank')
    choose('speler-zij-1-rol', 'bank')

    expect(labelsOf('wissel-wij-1-erin')).toEqual(['Kies een speler', '2 Speler 2'])
    expect(labelsOf('wissel-zij-1-erin')).toEqual(['Kies een speler', 'Aanvaller'])
  })

  it('says why the list is empty when nobody is on the bench, with a link to the places of the bench', () => {
    showWith(withoutBench(withSubstitutions))

    for (const [side, club] of [
      ['wij', 'sc Heerenveen'],
      ['zij', 'Testclub'],
    ] as const) {
      const card = document.getElementById(`wissel-${side}`)?.closest('.hf-card') as HTMLElement
      const link = card.querySelector('a[href]') as HTMLAnchorElement

      expect(card.textContent).toContain(`Bij ${club} staat niemand met de rol Bank, dus de lijst Erin is leeg.`)
      expect(link.getAttribute('href')).toBe(`#speler-${side}`)
      expect(document.getElementById(`speler-${side}`)?.tabIndex).toBe(-1)
    }
  })

  it('says it without JavaScript too, and says nothing when there is a bench or no substitution', () => {
    const html = (state: ReportFormState) =>
      renderToStaticMarkup(
        <ReportFormProvider action={() => Promise.resolve(state)} initial={state} {...props}>
          <ReportFields />
        </ReportFormProvider>,
      )

    expect(html(withoutBench(withSubstitutions))).toContain('Bij Testclub staat niemand met de rol Bank')
    expect(html(withSubstitutions)).not.toContain('staat niemand met de rol Bank')
    expect(html(withoutBench(initial))).not.toContain('staat niemand met de rol Bank')
  })

  it('keeps the rules of the bench: the line-up is not on it, and a player stays on it once', () => {
    showWith(withSubstitutions)
    choose('speler-wij-1-keuze', '3')

    // Player 3 is in the line-up now, and his place on the bench is empty.
    expect(labelsOf('wissel-wij-1-erin')).toEqual(['Niemand op de bank'])
  })
})

describe('the shoot-out in the form of a report', () => {
  const kick = (fields: Row): Row => ({ ...emptyRow('serie'), ...fields })
  const withSeries = (
    series: null | { against: number; for: number },
    overrides: Partial<ReportValues> = {},
    errors: ReportFormState['errors'] = {},
  ) => {
    const state: ReportFormState = { errors, values: { ...values, ...overrides }, version: 0, warnings: {} }

    return render(
      <ReportFormProvider
        action={() => Promise.resolve(state)}
        choices={{
          matchHref: '/beheer/wedstrijden/7',
          opponent: 'Testclub',
          series,
          showDelay: 'binnen vijf minuten',
          squad,
        }}
        initial={state}
        title="Dit is nog niet af"
      >
        <ReportFields />
      </ReportFormProvider>,
    )
  }
  const headings = () => [...document.querySelectorAll('h2')].map((heading) => heading.textContent)

  it('has a list for each team under the missed penalties when the match has a result of the series', () => {
    withSeries({ against: 3, for: 4 })

    expect(headings().filter((heading) => heading?.startsWith('Strafschoppenserie'))).toEqual([
      'Strafschoppenserie van sc Heerenveen',
      'Strafschoppenserie van Testclub',
    ])
    expect(headings().indexOf('Strafschoppenserie van sc Heerenveen')).toBe(
      headings().indexOf('Gemiste strafschoppen van sc Heerenveen') + 1,
    )
    expect(document.body.textContent).toContain('moet de uitslag van de serie geven: 4–3')
    expect(document.querySelector('button[value="serie-wij-toevoegen"]')?.textContent).toContain('Schot toevoegen')
    expect(document.querySelector('button[value="serie-zij-toevoegen"]')).not.toBeNull()
  })

  it('says where to fill in the result when the match has none, instead of a list', () => {
    withSeries(null)

    expect(headings().filter((heading) => heading?.startsWith('Strafschoppenserie'))).toEqual(['Strafschoppenserie'])
    expect(document.querySelector('button[value="serie-wij-toevoegen"]')).toBeNull()
    expect(document.body.textContent).toContain('Deze wedstrijd heeft geen uitslag van een strafschoppenserie.')
    expect(document.querySelector('a[href="/beheer/wedstrijden/7"]')?.textContent).toBe(
      'Vul die uitslag in bij de wedstrijd',
    )
  })

  it('keeps the list when the report holds kicks and the match has no result, so they can be taken away', () => {
    withSeries(null, { wij: { ...values.wij, serie: [kick({ speler: '1', uitkomst: 'raak' })] } })

    expect(document.querySelector('button[value="serie-wij-weghalen-1"]')).not.toBeNull()
    expect(document.body.textContent).not.toContain('Deze wedstrijd heeft geen uitslag')
  })

  it('offers the players of the report for sc Heerenveen, and an unknown player for a side that is not complete', () => {
    withSeries(
      { against: 3, for: 4 },
      {
        wij: { ...values.wij, serie: [kick({ speler: '2', uitkomst: 'naast' })] },
        zij: { ...emptySide(), serie: [kick({ uitkomst: 'raak' })] },
      },
    )

    expect(optionsOf('serie-wij-1-speler')).toEqual(['', '1', '2', '3'])
    expect(select('serie-wij-1-speler').value).toBe('2')
    expect([...select('serie-wij-1-speler').options].map((option) => option.text)[0]).toBe('Kies een speler')
    expect([...select('serie-zij-1-speler').options].map((option) => option.text)).toEqual(['Onbekende speler'])
    expect([...select('serie-wij-1-uitkomst').options].map((option) => option.text)).toEqual([
      'Kies de uitkomst',
      'Raak',
      'Naast',
      'Gestopt',
    ])
    expect(select('serie-wij-1-uitkomst').value).toBe('naast')
  })

  it('wants a player for the opponent when his side is complete', () => {
    withSeries({ against: 3, for: 4 }, { tegenstander: 'ja', zij: { ...emptySide(), serie: [kick({})] } })

    expect([...select('serie-zij-1-speler').options].map((option) => option.text)[0]).toBe('Kies een speler')
  })

  it('puts the focus on the card that explains, when the last kick of a match without a result is removed', () => {
    const state: ReportFormState = { errors: {}, focus: 'serie-wij', values, version: 1, warnings: {} }

    render(
      <ReportFormProvider
        action={() => Promise.resolve(state)}
        choices={{
          matchHref: '/beheer/wedstrijden/7',
          opponent: 'Testclub',
          series: null,
          showDelay: 'binnen vijf minuten',
          squad,
        }}
        initial={state}
        title="Dit is nog niet af"
      >
        <ReportFields />
      </ReportFormProvider>,
    )

    expect(document.activeElement?.id).toBe('serie-uitleg')
  })

  it('shows the errors of the rules at the row and at the list', () => {
    withSeries(
      { against: 3, for: 4 },
      { wij: { ...values.wij, serie: [kick({ speler: '1', uitkomst: 'raak' })] } },
      {
        'serie-wij': 'De schoten van sc Heerenveen geven 1 raak en de uitslag van de serie is 4–3.',
        'serie-wij-1-speler': 'Schot 1 van sc Heerenveen: Speler 1 schiet twee keer in de strafschoppenserie.',
      },
    )

    expect(document.getElementById('serie-wij')?.parentElement?.textContent).toContain('geven 1 raak')
    expect(document.getElementById('serie-wij-1-speler-error')?.textContent ?? document.body.textContent).toContain(
      'schiet twee keer',
    )
  })
})

describe('the choices of the substitutions and the roles in the form of a report', () => {
  const card = (soort: string, minuut: string, speler: string): Row => ({ ...emptyRow('kaart'), minuut, soort, speler })
  const moment = (minuut: string, fields: Row = {}): Row => ({ ...emptyRow('wissel'), minuut, ...fields })
  const stateOf = (wij: Partial<ReportValues['wij']>, speler = values.wij.speler): ReportFormState => ({
    ...initial,
    values: { ...values, wij: { ...values.wij, speler, ...wij } },
  })
  const choices = {
    matchHref: '/beheer/wedstrijden/7',
    opponent: 'Testclub',
    series: null,
    showDelay: 'binnen vijf minuten',
    squad,
  }
  const showState = (state: ReportFormState) =>
    render(
      <ReportFormProvider action={() => Promise.resolve(state)} choices={choices} initial={state} title="Titel">
        <ReportFields />
      </ReportFormProvider>,
    )
  const labelsOf = (id: string) => [...select(id).options].map((option) => option.text)

  it('has Erin before Eruit in the table of the substitutions', () => {
    showState(stateOf({ wissel: [moment('60')] }))

    expect(
      select('wissel-wij-1-erin').compareDocumentPosition(select('wissel-wij-1-eruit')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('lists in Eruit only who is on the pitch at that moment: a substitution and a red card change it', () => {
    const speler = [row('1'), row('2'), row('3'), row('4', 'bank')]

    showState(
      stateOf(
        {
          kaart: [card('rood', '20', '2')],
          wissel: [moment('30', { erin: '4', eruit: '1' }), moment('60')],
        },
        speler,
      ),
    )

    expect(optionsOf('wissel-wij-1-eruit')).toEqual(['', '1', '3'])
    expect(optionsOf('wissel-wij-2-eruit')).toEqual(['', '3', '4'])
  })

  it('leaves the list Eruit as it is while the minute is empty, in the order of the rows', () => {
    showState(
      stateOf({ wissel: [moment('', { erin: '3', eruit: '1' }), moment('')] }, [row('1'), row('2'), row('3', 'bank')]),
    )

    expect(optionsOf('wissel-wij-1-eruit')).toEqual(['', '1', '2'])
    expect(optionsOf('wissel-wij-2-eruit')).toEqual(['', '2', '3'])
  })

  it('keeps the player the row has, with a note, when he is not on the pitch', () => {
    showState(stateOf({ wissel: [moment('60', { eruit: '3' })] }, [row('1'), row('2'), row('3', 'bank')]))

    expect(optionsOf('wissel-wij-1-eruit')).toEqual(['', '1', '2', '3'])
    expect(labelsOf('wissel-wij-1-eruit').at(-1)).toBe('3 Speler 3 (staat dan niet op het veld)')
  })

  it('changes the list Eruit while the editor types the minute', () => {
    showState(
      stateOf({ wissel: [moment('60', { erin: '3', eruit: '1' }), moment('')] }, [
        row('1'),
        row('2'),
        row('4', 'bank'),
      ]),
    )

    expect(optionsOf('wissel-wij-2-eruit')).toEqual(['', '2', '3'])
    fireEvent.change(
      select('wissel-wij-1-erin').ownerDocument.getElementById('wissel-wij-2-minuut') as HTMLInputElement,
      {
        target: { value: '50' },
      },
    )

    expect(optionsOf('wissel-wij-2-eruit')).toEqual(['', '1', '2'])
  })

  it('shows every player in Eruit and every role without JavaScript, where the server does the checking', () => {
    const html = renderToStaticMarkup(
      <ReportFormProvider
        action={() => Promise.resolve(initial)}
        choices={choices}
        initial={stateOf({ wissel: [moment('60', { erin: '3' })] }, [
          row('1'),
          row('2', 'aanvoerder'),
          row('3', 'bank'),
        ])}
        title="Titel"
      >
        <ReportFields />
      </ReportFormProvider>,
    )
    const eruit = /<select[^>]*name="wissel-wij-1-eruit"[^>]*>(.*?)<\/select>/u.exec(html)?.[1] ?? ''
    const role = /<select[^>]*name="speler-wij-1-rol"[^>]*>(.*?)<\/select>/u.exec(html)?.[1] ?? ''

    expect(eruit.match(/<option/gu)).toHaveLength(4)
    expect(role).toContain('value="aanvoerder"')
  })

  it('takes the captain out of the list Rol of the other players, and gives it back when he gives it up', () => {
    showState(stateOf({}, [row('1'), row('2', 'aanvoerder'), row('3', 'bank')]))

    expect(optionsOf('speler-wij-1-rol')).toEqual(['basis', 'bank'])
    expect(optionsOf('speler-wij-2-rol')).toEqual(['basis', 'aanvoerder', 'bank'])

    choose('speler-wij-2-rol', 'basis')

    expect(optionsOf('speler-wij-1-rol')).toEqual(['basis', 'aanvoerder', 'bank'])
  })

  it('puts the lists of players in the order of the shirt numbers and the names', () => {
    showState(
      stateOf({ wissel: [moment('60')] }, [
        { ...emptyRow('speler'), keuze: 'andere', naam: 'Zonder', rugnummer: '' },
        { ...emptyRow('speler'), keuze: 'andere', naam: 'Negen', rugnummer: '9' },
        { ...emptyRow('speler'), keuze: 'andere', naam: 'Twee', rugnummer: '2' },
      ]),
    )

    expect(labelsOf('wissel-wij-1-eruit')).toEqual(['Kies een speler', '2 Twee', '9 Negen', 'Zonder'])
  })

  it('tells what Eruit and Rol show, tied to the lists with aria-describedby', () => {
    showState(stateOf({ wissel: [moment('60')] }))

    for (const [id, hint] of [
      ['wissel-wij-1-eruit', 'eruit-hint-wij'],
      ['speler-wij-1-rol', 'rol-hint-wij'],
    ] as const) {
      expect(select(id).getAttribute('aria-describedby')).toBe(hint)
      expect(document.getElementById(hint)?.textContent).not.toBe('')
    }

    expect(document.getElementById('eruit-hint-wij')?.textContent).toContain('op dat moment op het veld')
  })

  it('keeps the error of a field next to the hint it is tied to', () => {
    showState({
      ...stateOf({ wissel: [moment('60', { eruit: '3' })] }, [row('1'), row('2'), row('3', 'bank')]),
      errors: { 'wissel-wij-1-eruit': 'Speler 3 staat dan niet op het veld.' },
    })

    expect(select('wissel-wij-1-eruit').getAttribute('aria-describedby')).toBe(
      'eruit-hint-wij wissel-wij-1-eruit-error',
    )
  })
})

describe('the input that the browser keeps for the form of a report', () => {
  const withoutMatch = {
    matchHref: '/beheer/wedstrijden/7',
    opponent: 'Testclub',
    series: null,
    showDelay: 'binnen vijf minuten',
    squad,
  }
  const choices = { ...withoutMatch, matchId: 7 }
  const typed: ReportValues = { ...values, bron: 'Wedstrijdformulier' }
  const keep = (draft: ReportValues = typed) => saveDraft(7, draft, values, Date.now())
  const open = (more: { noMatch?: boolean; saved?: boolean } = {}) =>
    render(
      <ReportFormProvider
        action={() => Promise.resolve(initial)}
        choices={more.noMatch === true ? withoutMatch : choices}
        initial={initial}
        title="Titel"
      >
        <ReportDraftNotice saved={more.saved} />
        <ReportFields />
      </ReportFormProvider>,
    )
  const notice = () => document.getElementById('bewaarde-invoer') as HTMLElement
  const bron = () => document.getElementById('bron') as HTMLInputElement
  const button = (name: string) =>
    [...document.querySelectorAll('button')].find((candidate) => candidate.textContent === name)

  it('shows nothing when there is no input kept, and when it is the same as the server has', () => {
    open()

    expect(notice().textContent).toBe('')
    expect(button('Herstel')).toBeUndefined()
    cleanup()

    localStorage.setItem('fansite-verslag-7', JSON.stringify({ savedAt: Date.now(), values }))
    open()

    expect(notice().textContent).toBe('')
  })

  it('keeps the input when a field is left, under the key of the match, and only when it changed', () => {
    open()
    fireEvent.change(bron(), { target: { value: 'Uitzending' } })

    expect(localStorage.getItem('fansite-verslag-7')).toBeNull()

    fireEvent.blur(bron())

    const stored = JSON.parse(localStorage.getItem('fansite-verslag-7') ?? '{}') as {
      savedAt: number
      values: ReportValues
    }

    expect(stored.values.bron).toBe('Uitzending')
    expect(typeof stored.savedAt).toBe('number')
    expect(Object.keys(stored)).toEqual(['savedAt', 'values'])

    fireEvent.blur(bron())

    expect((JSON.parse(localStorage.getItem('fansite-verslag-7') ?? '{}') as { savedAt: number }).savedAt).toBe(
      stored.savedAt,
    )
  })

  it('keeps nothing for a screen without a match number', () => {
    open({ noMatch: true })
    fireEvent.change(bron(), { target: { value: 'Uitzending' } })
    fireEvent.blur(bron())

    expect(localStorage.length).toBe(0)
  })

  it('says it holds input that differs, as a status, with Herstel and Weggooien, and does not take the focus', () => {
    keep()
    open()

    expect(notice().getAttribute('role')).toBe('status')
    expect(notice().textContent).toContain('bewaarde invoer')
    expect(button('Herstel')).toBeDefined()
    expect(button('Weggooien')).toBeDefined()
    expect(document.activeElement).toBe(document.body)
    expect(bron().value).toBe('')
  })

  it('puts the input in the form with Herstel, and changes nothing before', () => {
    keep()
    open()

    expect(bron().value).toBe('')

    fireEvent.click(button('Herstel') as HTMLElement)

    expect(bron().value).toBe('Wedstrijdformulier')
    expect(notice().textContent).toContain('staat weer in het formulier')
    expect(button('Herstel')).toBeUndefined()
    expect(document.activeElement).toBe(notice())
  })

  it('takes the input away with Weggooien, and leaves the form as it is', () => {
    keep()
    open()
    fireEvent.click(button('Weggooien') as HTMLElement)

    expect(localStorage.getItem('fansite-verslag-7')).toBeNull()
    expect(bron().value).toBe('')
    expect(notice().textContent).toContain('weggegooid')
    expect(document.activeElement).toBe(notice())
  })

  it('takes the input away on the page after a save that worked, and shows nothing', () => {
    keep()
    open({ saved: true })

    expect(localStorage.getItem('fansite-verslag-7')).toBeNull()
    expect(notice().textContent).toBe('')
  })

  it('works as it did when the text is broken or the storage is blocked', () => {
    localStorage.setItem('fansite-verslag-7', 'geen json')

    expect(() => open()).not.toThrow()
    expect(notice().textContent).toBe('')
    cleanup()

    const blocked = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => open()).not.toThrow()
    expect(notice().textContent).toBe('')
    expect(() => fireEvent.blur(bron())).not.toThrow()
    blocked.mockRestore()
  })

  it('is not there without JavaScript: the notice draws an empty status and nothing else', () => {
    keep()

    const html = renderToStaticMarkup(
      <ReportFormProvider action={() => Promise.resolve(initial)} choices={choices} initial={initial} title="Titel">
        <ReportDraftNotice />
      </ReportFormProvider>,
    )

    expect(html).not.toContain('Herstel')
  })
})
