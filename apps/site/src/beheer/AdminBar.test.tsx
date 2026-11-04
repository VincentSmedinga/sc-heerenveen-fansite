import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { findSession } from '#src/beheer/sessions'

import { AdminBar } from './AdminBar'
import { sessionToken } from './require-role'

let pathname = '/beheer'

vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/app/beheer/actions', () => ({ logOut: vi.fn() }))
vi.mock('./require-role', () => ({ sessionToken: vi.fn() }))
vi.mock('#src/beheer/sessions', () => ({ findSession: vi.fn() }))

const render = async (path: string) => {
  pathname = path

  return renderToStaticMarkup(await AdminBar())
}
const links = (html: string) =>
  [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label])

beforeEach(() => {
  vi.mocked(sessionToken).mockReset()
  vi.mocked(sessionToken).mockResolvedValue('token')
  vi.mocked(findSession).mockReset()
  vi.mocked(findSession).mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId: 1 })
})

describe('the bar of the admin', () => {
  it('is a navigation named Beheer, with the screens of a beheerder and the current one marked', async () => {
    const html = await render('/beheer/artikelen/nieuw')

    expect(html).toContain('aria-label="Beheer"')
    expect(links(html)).toEqual([
      ['/beheer', 'Beheer'],
      ['/beheer/berichten', 'Berichten'],
      ['/beheer/artikelen', 'Artikelen'],
      ['/beheer/wedstrijden', 'Wedstrijden'],
      ['/beheer/stadions', 'Stadions'],
      ['/beheer/bezoek', 'Bezoek'],
    ])
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(
      /aria-current="page"[^>]*href="\/beheer\/artikelen"|href="\/beheer\/artikelen"[^>]*aria-current="page"/,
    )
  })

  it('ends with a button Uitloggen in a form, in the same navigation, for a beheerder and a moderator', async () => {
    for (const role of ['beheerder', 'moderator'] as const) {
      vi.mocked(findSession).mockResolvedValue({ email: 'sanne@example.org', role, userId: 1 })

      const html = await render('/beheer/berichten')

      expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual([
        '<button class="hf-navigation-sublink" type="submit">Uitloggen</button>',
      ])
      expect(html).toMatch(/<nav[^>]*aria-label="Beheer"[\s\S]*<form[^>]*>\s*<button[\s\S]*<\/form>[\s\S]*<\/nav>/)
      expect(html.lastIndexOf('<a ')).toBeLessThan(html.indexOf('<button'))
    }
  })

  it('shows a moderator Berichten only', async () => {
    vi.mocked(findSession).mockResolvedValue({ email: 'jan@example.org', role: 'moderator', userId: 2 })

    expect(links(await render('/beheer/berichten'))).toEqual([['/beheer/berichten', 'Berichten']])
  })

  it('draws no bar on the login pages, whatever the session', async () => {
    expect(await render('/beheer/inloggen')).toBe('')
    expect(await render('/beheer/inloggen/verstuurd')).toBe('')
  })

  it('draws nothing without a cookie or with a session that has ended', async () => {
    vi.mocked(sessionToken).mockResolvedValue(undefined)
    expect(await render('/beheer')).toBe('')
    expect(findSession).not.toHaveBeenCalled()

    vi.mocked(sessionToken).mockResolvedValue('old')
    vi.mocked(findSession).mockResolvedValue(undefined)
    expect(await render('/beheer')).toBe('')
  })
})
