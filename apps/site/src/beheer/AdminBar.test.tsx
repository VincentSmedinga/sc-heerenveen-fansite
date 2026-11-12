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
  vi.mocked(findSession).mockResolvedValue({ email: 'sanne@example.org', firstName: 'Sanne', role: 'owner', userId: 1 })
})

describe('the bar of the admin', () => {
  it('is a navigation named Beheer, with the screens of the owner and the current one marked', async () => {
    const html = await render('/beheer/artikelen/nieuw')

    expect(html).toContain('aria-label="Beheer"')
    expect(links(html)).toEqual([
      ['/beheer', 'Beheer'],
      ['/beheer/berichten', 'Berichten'],
      ['/beheer/artikelen', 'Artikelen'],
      ['/beheer/wedstrijden', 'Wedstrijden'],
      ['/beheer/spelers', 'Spelers'],
      ['/beheer/stadions', 'Stadions'],
      ['/beheer/clubnamen', 'Clubnamen'],
      ['/beheer/kwaliteit', 'Kwaliteit'],
      ['/beheer/bezoek', 'Bezoek'],
      ['/beheer/accounts', 'Accounts'],
      ['/beheer/mijn-account', 'Sanne'],
    ])
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(
      /aria-current="page"[^>]*href="\/beheer\/artikelen"|href="\/beheer\/artikelen"[^>]*aria-current="page"/,
    )
  })

  it('ends with a button Uitloggen in a form, in the same navigation, for every role', async () => {
    for (const role of ['owner', 'editor', 'author'] as const) {
      vi.mocked(findSession).mockResolvedValue({ email: 'sanne@example.org', firstName: 'Sanne', role, userId: 1 })

      const html = await render('/beheer/berichten')

      expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual([
        '<button class="hf-navigation-sublink" type="submit">Uitloggen</button>',
      ])
      expect(html).toMatch(/<nav[^>]*aria-label="Beheer"[\s\S]*<form[^>]*>\s*<button[\s\S]*<\/form>[\s\S]*<\/nav>/)
      expect(html.lastIndexOf('<a ')).toBeLessThan(html.indexOf('<button'))
    }
  })

  it('shows an author the start, the articles and his account, which says Mijn account without a first name', async () => {
    vi.mocked(findSession).mockResolvedValue({ email: 'jan@example.org', firstName: '', role: 'author', userId: 2 })

    expect(links(await render('/beheer/artikelen'))).toEqual([
      ['/beheer', 'Beheer'],
      ['/beheer/artikelen', 'Artikelen'],
      ['/beheer/mijn-account', 'Mijn account'],
    ])
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
