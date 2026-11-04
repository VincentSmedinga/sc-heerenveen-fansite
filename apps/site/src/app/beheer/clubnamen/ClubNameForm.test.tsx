// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { NameFormState } from '#src/beheer/club-name-fields'

import { ClubNameForm } from './ClubNameForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

describe('the form of the names of a club', () => {
  it('has a place for the error of the whole list that the list of errors links to, and puts the focus on that list', async () => {
    const answer: NameFormState = {
      errors: {
        regels: 'Een lijst heeft minstens één regel. Wil je er geen eigen lijst meer? Kies "Lijst weghalen".',
      },
      values: [],
    }
    const { container } = render(<ClubNameForm action={() => Promise.resolve(answer)} initial={[]} />)

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    const link = await screen.findByRole('link', { name: /minstens één regel/ })
    const target = document.getElementById('regels')

    expect(link.getAttribute('href')).toBe('#regels')
    expect(target?.textContent).toContain('minstens één regel')
    expect(target?.getAttribute('tabindex')).toBe('-1')
    await waitFor(() => expect(document.activeElement?.id).toBe('fouten'))
  })

  it('links the list of errors to the field of a line that is wrong', async () => {
    const answer: NameFormState = {
      errors: { 'regel-1-naam': 'Vul de naam van de club in.' },
      values: [{ dag: '', naam: '', seizoen: '', toelichting: 'Alleen een toelichting' }],
    }
    const { container } = render(<ClubNameForm action={() => Promise.resolve(answer)} initial={[]} />)

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    const link = await screen.findByRole('link', { name: 'Vul de naam van de club in.' })

    expect(link.getAttribute('href')).toBe('#regel-1-naam')
    expect(document.getElementById('regel-1-naam')).not.toBeNull()
  })
})
