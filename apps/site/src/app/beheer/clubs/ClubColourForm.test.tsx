// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ClubColourState } from '#src/beheer/club-colour-fields'

import { ClubColourForm } from './ClubColourForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const show = (action: Parameters<typeof ClubColourForm>[0]['action'], choice: null | string = null) =>
  render(
    <ClubColourForm action={action} choice={choice} colour="#e30613" name="Oefenstad FC" showDelay="binnen een uur" />,
  )

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Opslaan: kleur van Oefenstad FC' }))

describe('the form of the colour of a club', () => {
  it('says which colour holds now, with the list chosen without a choice', () => {
    show(() => Promise.resolve({}))

    expect(screen.getByText(/Nu: #e30613, uit de lijst\./u)).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Uit de lijst' }).checked).toBe(true)
    expect(screen.getByRole('textbox', { name: /Eigen kleur/u })).toBeTruthy()
  })

  it('sends the choice and the colour, and says what was saved', async () => {
    const action = vi.fn<(previous: ClubColourState, formData: FormData) => Promise<ClubColourState>>(() =>
      Promise.resolve({ saved: '#00a651' }),
    )

    show(action)
    fireEvent.click(screen.getByRole('radio', { name: 'Eigen kleur' }))
    fireEvent.change(screen.getByRole('textbox', { name: /Eigen kleur/u }), { target: { value: '#00a651' } })
    save()

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Opgeslagen: Oefenstad FC heeft de kleur #00a651.'),
    )
    expect(action.mock.calls[0]?.[1].get('keuze')).toBe('eigen')
    expect(action.mock.calls[0]?.[1].get('kleur')).toBe('#00a651')
  })

  it('says what holds now after a choice, with where it comes from', async () => {
    show(() => Promise.resolve({ mode: 'eigen', saved: '#00a651' }))
    save()

    await waitFor(() => expect(screen.getByText(/Nu: #00a651, gekozen door de redactie\./u)).toBeTruthy())

    cleanup()
    show(() => Promise.resolve({ mode: 'geen', saved: '' }))
    save()

    await waitFor(() => expect(screen.getByText(/Nu: geen kleur, gekozen door de redactie\./u)).toBeTruthy())

    cleanup()
    show(() => Promise.resolve({ mode: 'lijst', saved: '#e30613' }), '#00a651')
    save()

    await waitFor(() => expect(screen.getByText(/Nu: #e30613, uit de lijst\./u)).toBeTruthy())
  })

  it('still says what was saved after a later colour that is wrong', async () => {
    const action = vi
      .fn<(previous: ClubColourState, formData: FormData) => Promise<ClubColourState>>()
      .mockResolvedValueOnce({ mode: 'eigen', saved: '#00a651' })
      .mockResolvedValueOnce({ colour: 'rood', error: 'Dat is geen kleur.', field: 'kleur', mode: 'eigen' })

    show(action)
    save()
    await waitFor(() => expect(screen.getByText(/Nu: #00a651, gekozen door de redactie\./u)).toBeTruthy())
    await waitFor(() => expect(screen.getByRole('button', { name: /Opslaan/u }).hasAttribute('disabled')).toBe(false))
    save()
    await waitFor(() => expect(screen.getByText('Dat is geen kleur.')).toBeTruthy())

    expect(screen.getByText(/Nu: #00a651, gekozen door de redactie\./u)).toBeTruthy()
  })

  it('shows the error at the field, keeps the value and moves the focus there', async () => {
    show(() => Promise.resolve({ colour: 'rood', error: 'Dat is geen kleur.', field: 'kleur', mode: 'eigen' }))
    save()

    await waitFor(() => expect(document.activeElement?.id).toBe('eigen-kleur'))
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: /Eigen kleur/u }).value).toBe('rood')
    expect(screen.getByText('Dat is geen kleur.')).toBeTruthy()
  })
})
