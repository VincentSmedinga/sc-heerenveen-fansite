// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { MergeForm } from './MergeForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const show = (answer: { error?: string }) =>
  render(
    <MergeForm
      action={() => Promise.resolve(answer)}
      backHref="/beheer/spelers/3"
      backLabel="Terug naar Oude Naam, zonder samen te voegen"
      label="Voeg Oude Naam samen met Nieuwe Naam"
    />,
  )

describe('the form that merges two persons', () => {
  it('has one button that names both persons, and the link that goes back', () => {
    show({})

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Voeg Oude Naam samen met Nieuwe Naam' })).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Terug naar Oude Naam, zonder samen te voegen' }).getAttribute('href'),
    ).toBe('/beheer/spelers/3')
  })

  it('gives the focus to the error of a merge that failed', async () => {
    show({ error: 'De personen zijn niet samengevoegd.' })
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(document.activeElement?.id).toBe('samenvoegen-fout'))
    expect(document.activeElement?.textContent).toContain('De personen zijn niet samengevoegd.')
  })
})
