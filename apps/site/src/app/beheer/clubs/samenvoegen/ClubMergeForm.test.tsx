// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { MergeClubsState } from '../actions'

import { ClubMergeForm } from './ClubMergeForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const show = (answer: MergeClubsState) =>
  render(
    <ClubMergeForm
      action={() => Promise.resolve(answer)}
      backHref="/beheer/clubs"
      backLabel="Terug naar de clubs, zonder samen te voegen"
      keptName="VVV-Venlo"
      label="Voeg VVV samen met VVV-Venlo"
    />,
  )

describe('the form that merges two clubs', () => {
  it('has one button that names both clubs, and the link that goes back', () => {
    show({})

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Voeg VVV samen met VVV-Venlo' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Terug naar de clubs, zonder samen te voegen' }).getAttribute('href')).toBe(
      '/beheer/clubs',
    )
  })

  it('puts a merge that failed above the form with the focus, and gives the season no error', async () => {
    show({ failure: 'De clubs zijn niet samengevoegd. Er is niets veranderd.', sinds: '2002/03' })
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(document.activeElement?.id).toBe('samenvoegen-fout'))
    expect(document.activeElement?.textContent).toContain('De clubs zijn niet samengevoegd.')
    expect(document.activeElement?.compareDocumentPosition(screen.getByRole('textbox')) ?? 0).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )

    const field = screen.getByRole('textbox')

    expect((field as HTMLInputElement).value).toBe('2002/03')
    expect(field.getAttribute('aria-invalid')).not.toBe('true')
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })
})
