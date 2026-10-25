import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ConfirmPage, { metadata as confirmMetadata } from './inloggen/bevestigen/page'
import LoginPage, { metadata as loginMetadata } from './inloggen/page'
import SentPage, { metadata as sentMetadata } from './inloggen/verstuurd/page'
import AdminPage, { metadata as adminMetadata } from './page'

const { findSession, loginLinkWorks, requireRole, sessionToken } = vi.hoisted(() => ({
  findSession: vi.fn(),
  loginLinkWorks: vi.fn(),
  requireRole: vi.fn(),
  sessionToken: vi.fn(),
}))

vi.mock('../../database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('../../beheer/require-role', () => ({ requireRole, sessionToken }))
vi.mock('../../beheer/sessions', () => ({ findSession, loginLinkWorks }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

beforeEach(() => {
  findSession.mockReset()
  loginLinkWorks.mockReset()
  requireRole.mockReset()
  sessionToken.mockReset()
  sessionToken.mockResolvedValue(undefined)
})

/** The h1s, h2s and so on of some markup, as text. */
const headings = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)].map(([, level, text]) => `h${level} ${text}`)

describe('every page of the admin', () => {
  it.each([
    ['the admin', adminMetadata],
    ['the login page', loginMetadata],
    ['the page after the request', sentMetadata],
    ['the page of the link', confirmMetadata],
  ])('tells search engines to stay away from %s', (_name, metadata) => {
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })
})

describe('the admin', () => {
  it('says who is logged in, links to the list of items and has a button to log out', async () => {
    requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })

    const html = renderToStaticMarkup(await AdminPage())

    expect(requireRole).toHaveBeenCalledWith('beheerder', 'moderator')
    expect(headings(html)).toEqual(['h1 Beheer'])
    expect(html).toContain('Je bent ingelogd als jelle@example.org.')
    expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual(['<button type="submit">Uitloggen</button>'])
    expect(html.match(/<a [^>]*>(.*?)<\/a>/g)).toEqual([
      '<a href="/beheer/berichten">Berichten verbergen of weer tonen</a>',
    ])
  })

  it('shows nothing to somebody without a session', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(AdminPage()).rejects.toThrow('redirect to /beheer/inloggen')
  })
})

describe('the login page', () => {
  const render = async (fout?: string) =>
    renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve(fout === undefined ? {} : { fout }) }))

  it('asks for an email address and nothing else: no password, no puzzle', async () => {
    const html = await render()

    expect(headings(html)).toEqual(['h1 Inloggen voor beheer'])
    expect(html.match(/<input[^>]*>/g)).toHaveLength(1)
    expect(html).toMatch(/<label[^>]*for="e-mail"[^>]*>E-mailadres<\/label>/)
    expect(html).toMatch(
      /<input[^>]*autoComplete="email"[^>]*type="email"|<input[^>]*type="email"[^>]*autoComplete="email"/i,
    )
    expect(html).toMatch(/<input[^>]*name="email"/)
    expect(html).toContain('Je hebt geen wachtwoord nodig.')
    expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual(['<button type="submit">Stuur me een link</button>'])
    expect(html).not.toMatch(/captcha|recaptcha|password/i)
  })

  it('shows no error at first', async () => {
    expect(await render()).not.toContain('Er is iets mis')
  })

  it('shows a wrong address in the summary and at the field', async () => {
    const message = 'Vul een e-mailadres in, zoals naam@voorbeeld.nl.'
    const html = await render('ongeldig')

    expect(html).toContain('Er is iets mis')
    expect(html).toContain(`<a href="#e-mail">${message}</a>`)
    expect(html).toContain('aria-invalid="true"')
    expect(html.split(message)).toHaveLength(3)
  })

  it.each([
    ['te-veel', 'Er zijn te veel links gevraagd. Probeer het over een kwartier opnieuw.'],
    ['link', 'Die link werkt niet meer. Vraag hieronder een nieuwe aan.'],
  ])('says %s in a message above the form, and does not mark the field as wrong', async (fout, message) => {
    const html = await render(fout)

    expect(html).toContain(`<p>${message}</p>`)
    expect(html).not.toContain('Er is iets mis')
    expect(html).not.toContain('aria-invalid')
    expect(html.split(message)).toHaveLength(2)
  })

  it('shows no message for an error it does not know, and does not repeat what the address says', async () => {
    const html = await render('<script>alert(1)</script>')

    expect(html).not.toContain('Er is iets mis')
    expect(html).not.toContain('alert(1)')
  })

  it('goes on to the admin for somebody who is logged in already', async () => {
    sessionToken.mockResolvedValue('token')
    findSession.mockResolvedValue({ email: 'jelle@example.org', role: 'beheerder', userId: 1 })

    await expect(render()).rejects.toThrow('redirect to /beheer')
  })

  it('shows the form to somebody with a cookie whose session has ended', async () => {
    sessionToken.mockResolvedValue('token')
    findSession.mockResolvedValue(undefined)

    expect(await render()).toContain('Stuur me een link')
  })
})

describe('the page after the request', () => {
  it('says the same to everybody: if the address has an account, a link was mailed', () => {
    const html = renderToStaticMarkup(<SentPage />)

    expect(headings(html)).toEqual(['h1 Kijk in je mail'])
    expect(html).toContain('Als dit adres een account heeft, hebben we een link gemaild.')
    expect(html).toContain('De link werkt 15 minuten en één keer.')
    expect(html).toContain('<a href="/beheer/inloggen">Een ander adres proberen</a>')
  })
})

describe('the page of the link', () => {
  const render = async (token?: string) =>
    renderToStaticMarkup(await ConfirmPage({ searchParams: Promise.resolve(token === undefined ? {} : { token }) }))

  it('logs in only with a button, so opening the link does not use it up', async () => {
    loginLinkWorks.mockResolvedValue(true)

    const html = await render('abc')

    expect(headings(html)).toEqual(['h1 Inloggen'])
    // The page says that the link is right and what to do now, above the button, so the extra
    // click is no surprise.
    expect(html).toContain('Deze link klopt. Kies hieronder Inloggen om binnen te komen.')
    expect(html.indexOf('Deze link klopt.')).toBeLessThan(html.indexOf('<button'))
    expect(html).not.toContain('Deze link werkt niet')
    expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual(['<button type="submit">Inloggen</button>'])
    expect(html).not.toContain('abc')
    expect(loginLinkWorks).toHaveBeenCalledExactlyOnceWith({}, 'abc')
  })

  it.each([undefined, 'abc'])(
    'says the link does not work for token %j that does not work, and links to a new one',
    async (token) => {
      loginLinkWorks.mockResolvedValue(false)

      const html = await render(token)

      expect(headings(html)).toEqual(['h1 Deze link werkt niet'])
      expect(html).toContain('De link is verlopen of al gebruikt.')
      expect(html).not.toContain('Deze link klopt')
      expect(html).toContain('<a href="/beheer/inloggen">Vraag een nieuwe link aan</a>')
      expect(html).not.toContain('<button')
    },
  )

  it('does not ask the database about an address without a token', async () => {
    await render()

    expect(loginLinkWorks).not.toHaveBeenCalled()
  })
})
