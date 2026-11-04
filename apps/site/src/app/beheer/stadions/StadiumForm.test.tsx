// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { StadiumFormState } from '#src/beheer/stadium-fields'

import { StadiumForm } from './StadiumForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

describe('the form of the stadiums of a club', () => {
  it('has a place for the error of the whole list that the list of errors links to, and puts the focus on that list', async () => {
    const answer: StadiumFormState = {
      errors: {
        regels: 'Een lijst heeft minstens één regel. Wil je er geen eigen lijst meer? Kies "Terug naar Wikipedia".',
      },
      values: [],
    }
    const { container } = render(<StadiumForm action={() => Promise.resolve(answer)} initial={[]} />)

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    const link = await screen.findByRole('link', { name: /minstens één regel/ })
    const target = document.getElementById('regels')

    expect(link.getAttribute('href')).toBe('#regels')
    expect(target?.textContent).toContain('minstens één regel')
    expect(target?.getAttribute('tabindex')).toBe('-1')
    await waitFor(() => expect(document.activeElement?.id).toBe('fouten'))
  })

  it('links the list of errors to the field of a line that is wrong', async () => {
    const answer: StadiumFormState = {
      errors: { 'regel-1-naam': 'Vul de naam van het stadion in.' },
      values: [{ dag: '', naam: '', seizoen: '', toelichting: 'Alleen een toelichting' }],
    }
    const { container } = render(<StadiumForm action={() => Promise.resolve(answer)} initial={[]} />)

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    const link = await screen.findByRole('link', { name: 'Vul de naam van het stadion in.' })

    expect(link.getAttribute('href')).toBe('#regel-1-naam')
    expect(document.getElementById('regel-1-naam')).not.toBeNull()
  })
})
