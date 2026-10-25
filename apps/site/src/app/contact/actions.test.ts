import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MailModule from '../../mail'

import { emptyState } from '../../contact-message'
import { MailError } from '../../mail'

const sendMail = vi.hoisted(() => vi.fn())
const requestHeaders = vi.hoisted(() => ({ current: new Headers() }))

vi.mock('../../mail', async (importOriginal) => ({
  ...(await importOriginal<typeof MailModule>()),
  sendMail,
}))
vi.mock('next/headers', () => ({ headers: () => Promise.resolve(requestHeaders.current) }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect to ${path}`)
  },
}))

const { sendContactMessage } = await import('./actions')

function formWith(values: Record<string, string> = {}) {
  const formData = new FormData()

  for (const [name, value] of Object.entries({
    bericht: 'Dit artikel moet weg.',
    'e-mail': 'jan@example.org',
    link: 'https://example.org/artikel',
    naam: 'Jan de Vries',
    onderwerp: 'verwijderen',
    website: '',
    ...values,
  })) {
    formData.set(name, value)
  }

  return formData
}

beforeEach(() => {
  sendMail.mockReset()
  sendMail.mockResolvedValue(undefined)
  requestHeaders.current = new Headers({ host: 'localhost:3000', origin: 'http://localhost:3000' })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('sendContactMessage', () => {
  it('sends one mail with the right fields and sends the visitor to the confirmation', async () => {
    await expect(sendContactMessage(emptyState, formWith())).rejects.toThrow('redirect to /contact/verstuurd')

    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail).toHaveBeenCalledWith({
      replyTo: 'jan@example.org',
      subject: 'Contact: Een bericht laten verwijderen',
      text: expect.stringContaining('Dit artikel moet weg.'),
      to: 'fansite@heerenveen.org',
    })
  })

  it('returns an error for each wrong field, keeps what was filled in, and sends nothing', async () => {
    const state = await sendContactMessage(emptyState, formWith({ 'e-mail': 'jan', onderwerp: 'reclame' }))

    expect(Object.keys(state.errors).sort()).toEqual(['e-mail', 'onderwerp'])
    expect(state.values).toMatchObject({ bericht: 'Dit artikel moet weg.', 'e-mail': 'jan', naam: 'Jan de Vries' })
    expect(state.failure).toBeUndefined()
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('shows the confirmation and sends nothing when the trap is filled in', async () => {
    await expect(sendContactMessage(emptyState, formWith({ website: 'https://spam.example' }))).rejects.toThrow(
      'redirect to /contact/verstuurd',
    )

    expect(sendMail).not.toHaveBeenCalled()
  })

  it('refuses a request from another site, and one without an Origin, and sends nothing', async () => {
    requestHeaders.current = new Headers({ host: 'localhost:3000', origin: 'https://example.org' })
    expect((await sendContactMessage(emptyState, formWith())).failure).toBe('send')

    requestHeaders.current = new Headers({ host: 'localhost:3000' })
    expect((await sendContactMessage(emptyState, formWith())).failure).toBe('send')

    expect(sendMail).not.toHaveBeenCalled()
  })

  it('uses the forwarded host when the host sits behind a proxy', async () => {
    requestHeaders.current = new Headers({
      host: 'internal:3000',
      origin: 'https://sc.heerenveen.org',
      'x-forwarded-host': 'sc.heerenveen.org',
    })

    await expect(sendContactMessage(emptyState, formWith())).rejects.toThrow('redirect to /contact/verstuurd')
  })

  it('says it failed, keeps what was filled in and does not redirect when the mail is not sent', async () => {
    sendMail.mockRejectedValue(new MailError('Could not send the mail', 'ECONNECTION'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const state = await sendContactMessage(emptyState, formWith())

    expect(state.failure).toBe('send')
    expect(state.values['e-mail']).toBe('jan@example.org')
    expect(error).toHaveBeenCalledWith(
      'The contact form could not send its mail: Could not send the mail (ECONNECTION)',
    )
  })

  it('never logs what the visitor wrote, whatever fails', async () => {
    sendMail.mockRejectedValue(new Error('550 jan@example.org Dit artikel moet weg.'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await sendContactMessage(emptyState, formWith())

    const logged = JSON.stringify([error.mock.calls, log.mock.calls, warn.mock.calls])

    for (const secret of ['jan@example.org', 'Jan de Vries', 'Dit artikel moet weg.', 'example.org/artikel']) {
      expect(logged).not.toContain(secret)
    }
  })

  it('lets ten messages through in an hour and then says so, without sending an eleventh', async () => {
    vi.setSystemTime(new Date('2026-10-24T10:00:00Z'))

    // The limit is in the memory of the module, so every test before this one has used some of
    // it already.
    vi.resetModules()
    const { sendContactMessage: fresh } = await import('./actions')

    for (let index = 0; index < 10; index += 1) {
      await expect(fresh(emptyState, formWith())).rejects.toThrow('redirect to /contact/verstuurd')
    }

    const state = await fresh(emptyState, formWith())

    expect(state.failure).toBe('limit')
    expect(state.values['e-mail']).toBe('jan@example.org')
    expect(sendMail).toHaveBeenCalledTimes(10)

    vi.setSystemTime(new Date('2026-10-24T11:00:01Z'))

    await expect(fresh(emptyState, formWith())).rejects.toThrow('redirect to /contact/verstuurd')
  })

  it('does not count a message with errors or a robot against the limit', async () => {
    vi.resetModules()
    const { sendContactMessage: fresh } = await import('./actions')

    for (let index = 0; index < 15; index += 1) {
      await fresh(emptyState, formWith({ 'e-mail': 'jan' }))
      await expect(fresh(emptyState, formWith({ website: 'x' }))).rejects.toThrow('redirect')
    }

    await expect(fresh(emptyState, formWith())).rejects.toThrow('redirect to /contact/verstuurd')
  })
})
