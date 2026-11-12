// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { emptyFields, emptyGoal, type MatchFormState, type MatchValues, padGoals } from '#src/beheer/match-fields'

import { MatchFields, type MatchFormChoices, MatchFormProvider, summaryOf } from './MatchForm'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
  refresh.mockReset()
})

const choices: MatchFormChoices = {
  addPlayer: { href: '/beheer/spelers/nieuw?seizoen=2026-27&wedstrijd=183', season: '2026/27' },
  goalKinds: [
    { label: 'Gewoon', value: 'gewoon' },
    { label: 'Strafschop', value: 'strafschop' },
    { label: 'Eigen doelpunt', value: 'eigen' },
  ],
  home: true,
  knockout: false,
  opponent: 'Testclub',
  showDelay: 'binnen vijf minuten',
  squad: [{ id: 11, name: 'Luca Oyen' }],
  statuses: [{ label: 'Gespeeld', value: 'played' }],
  timeOptional: false,
}

// As the server gives it to the page: with as many goals as the end result asks for.
const initial = (wij: string, zij: string, goals: MatchValues['doelpunten'] = []): MatchValues =>
  padGoals({
    doelpunten: goals,
    reden: '',
    velden: { ...emptyFields, status: 'played', 'uitslag-wij': wij, 'uitslag-zij': zij },
  })

const show = (
  values: MatchValues,
  action?: (previous: MatchFormState, formData: FormData) => Promise<MatchFormState>,
) =>
  render(
    <MatchFormProvider
      action={action ?? (() => Promise.resolve({ errors: {}, values }))}
      choices={choices}
      initial={values}
    >
      <MatchFields />
    </MatchFormProvider>,
  )

const rows = () => document.querySelectorAll('.hf-input-table tbody tr')
const type = (id: string, value: string) =>
  fireEvent.change(document.getElementById(id) as HTMLElement, { target: { value } })
const hiddenFields = () =>
  [...document.querySelectorAll('fieldset[hidden]')].map((item) =>
    item.querySelector('input, select')?.getAttribute('name'),
  )

describe('the facts in the form of a match', () => {
  it('has a field for each fact with its label, and the error at its own field', () => {
    const values = {
      ...initial('1', '0'),
      velden: { ...emptyFields, opmerking: 'Begon later', status: 'played', toeschouwers: '21022' },
    }

    render(
      <MatchFormProvider action={() => Promise.resolve({ errors: {}, values })} choices={choices} initial={values}>
        <MatchFields />
      </MatchFormProvider>,
    )

    for (const label of ['Toeschouwers', 'Scheidsrechter', 'Stadion', 'Opmerking']) {
      expect(screen.getByLabelText(new RegExp(`^${label}`, 'u'))).toBeTruthy()
    }
    expect((screen.getByLabelText(/^Toeschouwers/u) as HTMLInputElement).value).toBe('21022')
    expect((screen.getByLabelText(/^Opmerking/u) as HTMLInputElement).value).toBe('Begon later')
  })
})

describe('the parts of the form of a match (#1162)', () => {
  it('shows only the cards of the part it is given', () => {
    const values = initial('1', '0')

    render(
      <MatchFormProvider action={() => Promise.resolve({ errors: {}, values })} choices={choices} initial={values}>
        <MatchFields part="gegevens" />
      </MatchFormProvider>,
    )

    expect([...document.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual(['Gegevens'])
  })

  it('says which goals came in without a player, and with which name', () => {
    const values = initial('1', '0')

    render(
      <MatchFormProvider
        action={() => Promise.resolve({ errors: {}, values })}
        choices={{ ...choices, incoming: [{ name: 'Hansen', number: 1 }] }}
        initial={values}
      >
        <MatchFields part="doelpunten" />
      </MatchFormProvider>,
    )

    expect(document.body.textContent).toContain('Zonder speler binnengekomen: doelpunt 1 als "Hansen".')
  })

  it('links an error of another part to the whole form, and the errors of the part to their field', () => {
    const state: MatchFormState = {
      errors: { doelpunten: 'De doelpunten geven 2–1.', reden: 'Schrijf waarom.', 'uitslag-wij': 'Vul een getal in.' },
      values: initial('3', '1'),
    }

    expect(summaryOf(state, 'uitslag')).toEqual([
      { id: 'uitslag-wij', message: 'Vul een getal in.' },
      { id: 'hele-wedstrijd', message: 'In een ander deel van de wedstrijd: De doelpunten geven 2–1.' },
      { id: 'reden', message: 'Schrijf waarom.' },
    ])
    expect(summaryOf(state).map(({ id }) => id)).toEqual(['uitslag-wij', 'doelpunten', 'reden'])
  })
})

describe('the time of the form of a match', () => {
  const rendered = (timeOptional: boolean) => {
    const values = initial('1', '0')

    return render(
      <MatchFormProvider
        action={() => Promise.resolve({ errors: {}, values })}
        choices={{ ...choices, timeOptional }}
        initial={values}
      >
        <MatchFields />
      </MatchFormProvider>,
    )
  }

  it('says that the time may stay empty for a match from the archive of the old fansite', () => {
    rendered(true)

    expect(document.body.textContent).toContain('Staat de tijd niet bij de sc Heerenveen Fansite? Laat hem dan leeg.')
  })

  it('says nothing about it for any other match', () => {
    rendered(false)

    expect(document.body.textContent).not.toContain('Laat hem dan leeg')
  })
})

describe('the goals of the form of a match', () => {
  it('has as many goals as the end result adds up to, and adds or removes them when it changes', () => {
    show(initial('1', '1', [{ ...emptyGoal, minuut: '12' }]))

    expect(rows()).toHaveLength(2)

    type('uitslag-wij', '3')
    expect(rows()).toHaveLength(4)
    expect(screen.getByRole('status').textContent).toBe('Het formulier heeft nu 4 doelpunten.')

    type('uitslag-wij', '0')
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('status').textContent).toBe('Het formulier heeft nu 1 doelpunt.')
  })

  it('never removes a goal that something is filled in for, and keeps the ones above it', () => {
    show(initial('1', '1'))
    type('doelpunt-2-minuut', '40')
    type('uitslag-wij', '0')

    // The end result asks for one goal, but the second has a minute, so the form keeps both.
    expect(rows()).toHaveLength(2)
    expect((document.getElementById('doelpunt-2-minuut') as HTMLInputElement).value).toBe('40')
  })

  it('does not change the goals while the end result is not two scores', () => {
    show(initial('1', '1'))
    type('uitslag-zij', '')

    expect(rows()).toHaveLength(2)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('does not change the goals when something else changes, such as the team of a goal', () => {
    show(initial('1', '1', [{ ...emptyGoal }, { ...emptyGoal }, { ...emptyGoal }]))
    fireEvent.click(document.querySelector('input[name="doelpunt-1-kant"][value="wij"]') as HTMLElement)

    expect(rows()).toHaveLength(3)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('asks for the squad for a goal of ours and a name for a goal of the opponent, and keeps the other field', () => {
    show(initial('1', '0', [{ ...emptyGoal, kant: 'wij', minuut: '12', speler: '11' }]))

    expect(hiddenFields()).toEqual(['doelpunt-1-naam'])

    fireEvent.click(document.querySelector('input[name="doelpunt-1-kant"][value="zij"]') as HTMLElement)
    type('doelpunt-1-naam', 'Sibbing')
    expect(hiddenFields()).toEqual(['doelpunt-1-speler'])
    // What was chosen before stays in the page, and is not sent.
    expect((document.getElementById('doelpunt-1-speler') as HTMLSelectElement).value).toBe('11')

    const formData = new FormData(document.getElementById('wedstrijd') as HTMLFormElement)

    expect(formData.has('doelpunt-1-speler')).toBe(false)
    expect(formData.get('doelpunt-1-naam')).toBe('Sibbing')

    // An own goal of the opponent was scored by a player of ours.
    type('doelpunt-1-soort', 'eigen')
    expect(hiddenFields()).toEqual(['doelpunt-1-naam'])
    expect((document.getElementById('doelpunt-1-naam') as HTMLInputElement).value).toBe('Sibbing')
  })

  it('shows the squad before a team is chosen', () => {
    show(initial('1', '0', [{ ...emptyGoal }]))

    expect(hiddenFields()).toEqual(['doelpunt-1-naam'])
  })

  it('gives every field of a goal its label, with the radio group for the team', () => {
    show(initial('1', '0', [{ ...emptyGoal, kant: 'wij' }]))

    const team = screen.getByRole('group', { name: 'Team, doelpunt 1' })

    expect(
      within(team)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['wij', 'zij'])
    expect((within(team).getByRole('radio', { name: 'sc Heerenveen' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole('button', { name: 'Doelpunt 1 weghalen' })).toBeTruthy()
  })
})

describe('the way to a new player in the form of a match', () => {
  const link = () => screen.getByRole('link', { name: /^De speler staat er niet in\? Voeg hem toe/u })

  it('has a link at the goals that names the season, and opens in a new tab so the form keeps its input', () => {
    show(initial('1', '0'))

    expect(link().textContent).toBe(
      'De speler staat er niet in? Voeg hem toe aan de selectie van 2026/27 (opent in een nieuw tabblad)',
    )
    expect(link().getAttribute('href')).toBe('/beheer/spelers/nieuw?seizoen=2026-27&wedstrijd=183')
    expect(link().getAttribute('target')).toBe('_blank')
  })

  it('asks the server for the squad again each time the editor comes back to the tab, and keeps what was typed', () => {
    show(initial('1', '0'))
    type('doelpunt-1-minuut', '12')

    // Coming back to the tab without having followed the link asks nothing.
    fireEvent.focus(window)
    expect(refresh).not.toHaveBeenCalled()

    // jsdom follows no link; the click is what the form remembers.
    link().addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(link())
    fireEvent.focus(window)
    expect(refresh).toHaveBeenCalledTimes(1)

    // The editor may look back before the player is saved, so every later return asks again.
    fireEvent.focus(window)
    expect(refresh).toHaveBeenCalledTimes(2)
    expect((document.getElementById('doelpunt-1-minuut') as HTMLInputElement).value).toBe('12')
  })

  it('has no such link without an address for it', () => {
    render(
      <MatchFormProvider
        action={() => Promise.resolve({ errors: {}, values: initial('1', '0') })}
        choices={{ ...choices, addPlayer: undefined }}
        initial={initial('1', '0')}
      >
        <MatchFields />
      </MatchFormProvider>,
    )

    expect(screen.queryByRole('link', { name: /Voeg hem toe/u })).toBeNull()
  })
})
