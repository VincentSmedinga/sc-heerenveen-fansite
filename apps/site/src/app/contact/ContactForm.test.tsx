// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type ContactState, emptyState } from '../../contact-message'
import { ContactForm } from './ContactForm'

const send = vi.hoisted(() => vi.fn<(previous: ContactState, formData: FormData) => Promise<ContactState>>())

vi.mock('./actions', () => ({ sendContactMessage: send }))

const values = {
  bericht: 'Dit artikel moet weg.',
  'e-mail': 'jan',
  link: 'https://example.org/artikel',
  naam: 'Jan de Vries',
  onderwerp: 'verwijderen',
}

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
  send.mockReset()
})

describe('ContactForm', () => {
  it('shows a summary with a link to each field, an error at each field, and keeps what was filled in', async () => {
    send.mockResolvedValue({
      errors: {
        'e-mail': 'Dit is geen e-mailadres. Schrijf het zo: naam@voorbeeld.nl.',
        onderwerp: 'Kies een onderwerp uit de lijst.',
      },
      values: { ...values, onderwerp: '' },
    })
    render(<ContactForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Versturen' }))

    const summary = await screen.findByRole('region', { name: 'Er is iets mis' })
    const links = [...summary.querySelectorAll('a')].map((link) => [link.getAttribute('href'), link.textContent])

    expect(links).toEqual([
      ['#e-mail', 'Dit is geen e-mailadres. Schrijf het zo: naam@voorbeeld.nl.'],
      ['#onderwerp', 'Kies een onderwerp uit de lijst.'],
    ])

    const email = screen.getByLabelText(/E-mailadres/)

    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(email.getAttribute('aria-describedby')).toContain('e-mail-error')
    expect(document.getElementById('e-mail-error')?.textContent).toContain('Dit is geen e-mailadres')
    expect((email as HTMLInputElement).value).toBe('jan')
    expect((screen.getByLabelText(/^Naam/) as HTMLInputElement).value).toBe('Jan de Vries')
    expect((screen.getByLabelText('Bericht') as HTMLTextAreaElement).value).toBe('Dit artikel moet weg.')
    expect((screen.getByLabelText(/Link naar/) as HTMLInputElement).value).toBe('https://example.org/artikel')
  })

  it('moves the focus to the summary after a submit with errors', async () => {
    send.mockResolvedValue({ errors: { bericht: 'Schrijf je bericht.' }, values: emptyState.values })
    render(<ContactForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Versturen' }))

    const summary = await screen.findByRole('region', { name: 'Er is iets mis' })

    await waitFor(() => expect(document.activeElement).toBe(summary))
  })

  it('shows the error of the name at the name field, and links to it from the summary', async () => {
    send.mockResolvedValue({
      errors: { naam: 'Schrijf je naam op één regel.' },
      values: { ...values, 'e-mail': 'jan@example.org' },
    })
    render(<ContactForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Versturen' }))

    const summary = await screen.findByRole('region', { name: 'Er is iets mis' })

    expect([...summary.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual(['#naam'])

    const name = screen.getByLabelText(/^Naam/)

    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(name.getAttribute('aria-describedby')).toContain('naam-error')
    expect(document.getElementById('naam-error')?.textContent).toContain('Schrijf je naam op één regel.')
  })

  it('moves the focus to the failure block when sending failed or the limit is reached', async () => {
    send.mockResolvedValue({ errors: {}, failure: 'send', values })
    render(<ContactForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Versturen' }))

    const failure = await screen.findByRole('region', { name: 'Het versturen is niet gelukt.' })

    await waitFor(() => expect(document.activeElement).toBe(failure))
  })

  it('says in text that sending failed, with the address to mail, and keeps what was filled in', async () => {
    send.mockResolvedValue({ errors: {}, failure: 'send', values })
    render(<ContactForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Versturen' }))

    const failure = await screen.findByRole('region', { name: 'Het versturen is niet gelukt.' })

    expect(failure.textContent).toBe('Het versturen is niet gelukt.Mail ons zelf: fansite@heerenveen.org')
    expect(failure.querySelector('a')?.getAttribute('href')).toBe('mailto:fansite@heerenveen.org')
    expect(failure.querySelector('a')?.querySelector('.hf-icon-head > svg[aria-hidden="true"]')).not.toBeNull()
    expect((screen.getByLabelText('Bericht') as HTMLTextAreaElement).value).toBe('Dit artikel moet weg.')
    expect(screen.queryByText('Bedankt, we hebben je bericht ontvangen.')).toBeNull()
  })

  it('says in text that too many messages came in', async () => {
    send.mockResolvedValue({ errors: {}, failure: 'limit', values })
    render(<ContactForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Versturen' }))

    const failure = await screen.findByRole('region', { name: 'Er komen nu veel berichten binnen.' })

    expect(failure.textContent).toBe(
      'Er komen nu veel berichten binnen.Probeer het later nog eens, of mail ons zelf: fansite@heerenveen.org',
    )
  })

  it('escapes what the visitor wrote', async () => {
    send.mockResolvedValue({
      errors: { bericht: 'Fout' },
      values: { ...values, bericht: '</textarea><script>alert(1)</script>', naam: '"><img src=x onerror=alert(1)>' },
    })
    render(<ContactForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Versturen' }))
    await screen.findByRole('region', { name: 'Er is iets mis' })

    expect(document.querySelector('script')).toBeNull()
    expect(document.querySelector('img')).toBeNull()
    expect((screen.getByLabelText('Bericht') as HTMLTextAreaElement).value).toBe('</textarea><script>alert(1)</script>')
  })
})
