// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import type { ReportPreviewMatch } from '#src/beheer/report-preview'

import {
  emptyRow,
  emptySide,
  noFormation,
  type ReportFormState,
  type ReportValues,
  type Row,
} from '#src/beheer/report-fields'

import { ReportFormProvider } from './ReportForm'
import { ReportWorkspace } from './ReportPreview'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const squad = Array.from({ length: 13 }, (_, index) => ({
  id: index + 1,
  name: `Speler ${index + 1}`,
  searchTerm: `Speler ${index + 1}`,
  shirtNumber: index + 1,
}))
const player = (keuze: string, rol = 'basis'): Row => ({ ...emptyRow('speler'), keuze, rol })

// Eleven of ours in the line-up, a goal of player 9 in the 12th minute, none of theirs.
const values: ReportValues = {
  bron: '',
  formatie: { wij: { eigen: '', keuze: '4-3-3' }, zij: noFormation() },
  status: 'bezig',
  tegenstander: 'nee',
  wij: {
    ...emptySide(),
    doelpunt: [{ ...emptyRow('doelpunt'), minuut: '12', speler: 'wij-9' }],
    speler: squad.slice(0, 11).map((one) => player(String(one.id))),
  },
  zij: emptySide(),
}
const initial: ReportFormState = { errors: {}, values, version: 0, warnings: {} }
const preview: ReportPreviewMatch = {
  afterNinety: null,
  extraTime: false,
  facts: [{ label: 'Competitie', value: 'Eredivisie' }],
  home: true,
  opponent: 'Testclub',
  penalties: null,
}

const provider = (withPreview = true) => (
  <ReportFormProvider
    action={() => Promise.resolve(initial)}
    choices={{
      matchHref: '/beheer/wedstrijden/7',
      opponent: 'Testclub',
      ...(withPreview ? { preview } : {}),
      series: null,
      showDelay: 'binnen vijf minuten',
      squad,
    }}
    initial={initial}
    title="Dit is nog niet af"
  >
    <ReportWorkspace />
  </ReportFormProvider>
)

const aside = () => document.querySelector('.hf-side-by-side-aside') as HTMLElement
const main = () => document.querySelector('.hf-side-by-side-main') as HTMLElement
const field = (name: string) => document.querySelector(`[name="${name}"]`) as HTMLInputElement
const course = () => aside().textContent

describe('the preview next to the form of a report', () => {
  it('is a region with a name, titled "Voorbeeld — Zo ziet de pagina eruit", that a keyboard can reach', () => {
    render(provider())

    expect(
      within(aside()).getByRole('heading', { hidden: true, name: 'Voorbeeld — Zo ziet de pagina eruit' }),
    ).not.toBeNull()
    expect(aside().getAttribute('aria-labelledby')).toBe('voorbeeld-kop')
    expect(aside().tabIndex).toBe(0)
  })

  it('is not a live region, so a screen reader does not read the page again at every key', () => {
    render(provider())

    expect(aside().querySelector('[aria-live]')).toBeNull()
    expect(aside().getAttribute('aria-live')).toBeNull()
  })

  it('is the page of the match: the clubs, the facts, the score bar, the pitch and the course of the match', () => {
    render(provider())

    const headings = within(aside())
      .getAllByRole('heading', { hidden: true })
      .map((heading) => heading.textContent)

    expect(headings).toContain('Wedstrijdverloop')
    expect(headings).toContain('Opstelling')
    expect(headings).toContain('Verloop')
    expect(course()).toContain('Eredivisie')
    expect(aside().querySelector('.hf-match-pitch')).not.toBeNull()
  })

  it('has the notice that the report is still being filled in while the status is Bezig, and not when it is Klaar', () => {
    render(provider())
    expect(course()).toContain('We vullen dit verslag nog in')

    fireEvent.change(field('status'), { target: { value: 'klaar' } })

    return waitFor(() => expect(course()).not.toContain('We vullen dit verslag nog in'))
  })

  it('has no h1 and no anchor of its own, since the page it is in has them', () => {
    render(provider())

    expect(aside().querySelector('h1')).toBeNull()
    expect(aside().querySelector('a[href^="#"]')).toBeNull()
  })

  it('follows a change of a minute, and of a name, at once', async () => {
    render(provider())
    expect(course()).toContain('Speler 9')

    fireEvent.change(field('doelpunt-wij-1-minuut'), { target: { value: '33' } })

    await waitFor(() => expect(aside().querySelector('.hf-match-event-minute')?.textContent).toBe('33’'))

    fireEvent.change(field('doelpunt-wij-1-speler'), { target: { value: 'wij-10' } })

    await waitFor(() => expect(course()).toContain('Speler 10'))
  })

  it('shows a goal that is added, and keeps the score and the bar with the goals', async () => {
    render(provider())
    expect(aside().querySelector('.hf-match-header-goals')?.textContent).toBe('1')

    fireEvent.change(field('doelpunt-wij-1-minuut'), { target: { value: '' } })

    // A goal without a minute stays in the preview, in a block of its own, and the score stays.
    await waitFor(() => expect(course()).toContain('Minuut onbekend'))
    expect(aside().querySelector('.hf-match-header-goals')?.textContent).toBe('1')
    expect(aside().querySelector('.hf-match-event-minute')?.textContent).toBe('–')

    // A goal without a scorer is not finished: it leaves the preview, and the score goes down.
    fireEvent.change(field('doelpunt-wij-1-speler'), { target: { value: '' } })

    await waitFor(() => expect(aside().querySelector('.hf-match-header-goals')?.textContent).toBe('0'))
    expect(aside().querySelector('.hf-match-event')).toBeNull()

    fireEvent.change(field('doelpunt-wij-1-speler'), { target: { value: 'wij-9' } })

    fireEvent.change(field('doelpunt-wij-1-minuut'), { target: { value: '70' } })

    await waitFor(() => expect(aside().querySelector('.hf-match-header-goals')?.textContent).toBe('1'))
    expect(course()).toContain('Wedstrijdverloop')
  })

  it('puts a frame on the line of the row that was changed', async () => {
    render(provider())
    expect(aside().querySelector('.hf-match-event-highlighted')).toBeNull()

    fireEvent.change(field('doelpunt-wij-1-minuut'), { target: { value: '14' } })

    await waitFor(() => expect(aside().querySelector('.hf-match-event-highlighted')).not.toBeNull())
    expect(aside().querySelector('.hf-match-event-highlighted')?.textContent).toContain('Speler 9')
  })

  it('does not frame a line when a field of a player was changed', async () => {
    render(provider())
    fireEvent.change(field('doelpunt-wij-1-minuut'), { target: { value: '14' } })
    await waitFor(() => expect(aside().querySelector('.hf-match-event-highlighted')).not.toBeNull())

    fireEvent.change(field('speler-wij-3-rol'), { target: { value: 'basis' } })

    await waitFor(() => expect(aside().querySelector('.hf-match-event-highlighted')).toBeNull())
  })
})

describe('the tabs on a phone', () => {
  it('are two buttons, Formulier and Voorbeeld, in a group with a name, and Formulier is pressed first', () => {
    const { getByRole } = render(provider())
    const group = getByRole('group', { name: 'Formulier of voorbeeld' })

    expect(within(group).getByRole('button', { name: 'Formulier' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(group).getByRole('button', { name: 'Voorbeeld' }).getAttribute('aria-pressed')).toBe('false')
    expect(main().hasAttribute('hidden')).toBe(false)
    expect(aside().hasAttribute('hidden')).toBe(true)
  })

  it('show the preview and hide the form, which stays in the page and keeps what was typed', () => {
    const { getByRole } = render(provider())

    fireEvent.change(field('doelpunt-wij-1-minuut'), { target: { value: '44' } })
    fireEvent.click(getByRole('button', { name: 'Voorbeeld' }))

    expect(aside().hasAttribute('hidden')).toBe(false)
    expect(main().hasAttribute('hidden')).toBe(true)
    expect(getByRole('button', { name: 'Voorbeeld' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(getByRole('button', { name: 'Formulier' }))

    expect(main().hasAttribute('hidden')).toBe(false)
    expect(field('doelpunt-wij-1-minuut').value).toBe('44')
  })
})

describe('the tabs after an answer of the server', () => {
  it('show the form again after a save with errors, so the focus can reach a field or the list of errors', async () => {
    const answered: ReportFormState = {
      ...initial,
      errors: { 'doelpunt-wij-1-minuut': 'Doelpunt 1: vul de minuut in.' },
      focus: 'fouten',
      version: 1,
    }
    const { getByRole } = render(
      <ReportFormProvider
        action={() => Promise.resolve(answered)}
        choices={{
          matchHref: '/beheer/wedstrijden/7',
          opponent: 'Testclub',
          preview,
          series: null,
          showDelay: 'binnen vijf minuten',
          squad,
        }}
        initial={initial}
        title="Dit is nog niet af"
      >
        <ReportWorkspace />
      </ReportFormProvider>,
    )

    fireEvent.click(getByRole('button', { name: 'Voorbeeld' }))
    expect(main().hasAttribute('hidden')).toBe(true)

    const save = document.querySelector('button[name="knop"][value="opslaan"]') as HTMLButtonElement

    await act(async () => {
      save.click()
    })

    await waitFor(() => expect(main().hasAttribute('hidden')).toBe(false))
    expect(aside().hasAttribute('hidden')).toBe(true)
    expect(getByRole('button', { name: 'Formulier' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('the page without a preview', () => {
  it('has only the form for a server that makes the page and a browser without JavaScript', () => {
    const html = renderToStaticMarkup(provider())

    expect(html).toContain('name="doelpunt-wij-1-minuut"')
    expect(html).not.toContain('Voorbeeld')
    expect(html).not.toContain('hf-side-by-side-tabs')
    expect(html).not.toContain('hf-side-by-side-aside')
  })

  it('has no preview and no tabs for a screen that gives no match to preview', () => {
    const { container } = render(provider(false))

    expect(container.querySelector('.hf-side-by-side-aside')).toBeNull()
    expect(container.querySelector('.hf-side-by-side-tabs')).toBeNull()
    expect(field('doelpunt-wij-1-minuut')).not.toBeNull()
  })
})
