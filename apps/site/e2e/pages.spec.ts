import { expect, test } from '@playwright/test'

import { adminCookie, type E2eRole } from './admin'
import { articleIdOf, testArticles } from './articles'
import { checkPage } from './check-page'

// Every page of the site, one line each, and the status code it must answer. A new page is one
// line here. An address that doesn't exist is the page "niet gevonden"; the status code also
// keeps a typo in a path from testing that page by mistake. A page with `admin` is a page of
// the admin, checked as the moderator or the beheerder that the global setup logs in (see
// admin.ts).
// `{draft}` and `{published}` in a path stand for the number of the made-up draft and the
// made-up published article, which the database gives.
const pages: { admin?: E2eRole; path: string; status: number }[] = [
  { path: '/', status: 200 },
  // The homepage with the older headlines, which the button under the first ten loads.
  { path: '/?nieuws=15', status: 200 },
  { path: '/podcasts', status: 200 },
  { path: '/podcasts?podcast=testpodcast', status: 200 },
  { path: '/podcasts?pagina=2', status: 200 },
  { path: '/podcasts?podcast=bestaat-niet', status: 404 },
  { path: '/podcasts?pagina=99', status: 404 },
  { path: '/podcasts?pagina=0', status: 404 },
  { path: '/bronnen', status: 200 },
  { path: '/over-ons', status: 200 },
  { path: '/contact', status: 200 },
  { path: '/contact/verstuurd', status: 200 },
  { path: '/privacy', status: 200 },
  { path: '/toegankelijkheid', status: 200 },
  { path: '/updates', status: 200 },
  // The way in to the admin. The admin itself is no page for a visitor without a session: it
  // goes to the login page.
  { path: '/beheer/inloggen', status: 200 },
  { path: '/beheer/inloggen?fout=ongeldig', status: 200 },
  { path: '/beheer/inloggen?fout=link', status: 200 },
  { path: '/beheer/inloggen/verstuurd', status: 200 },
  { path: '/beheer/inloggen/bevestigen?token=onbekend', status: 200 },
  // The admin, as a moderator who is logged in: the start page, the list of items, a search
  // with a result and without one.
  { admin: 'moderator', path: '/beheer', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten?q=Verzonnen', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten?q=bestaat+niet', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten?fout=weg', status: 200 },
  { admin: 'beheerder', path: '/beheer', status: 200 },
  // The articles are for a beheerder: the list, the form for a new one, the form of a draft and
  // of an article that is published (with its versions), the notice after an action, and the
  // preview of both. A moderator and a number that is no article get "niet gevonden".
  { admin: 'beheerder', path: '/beheer/artikelen', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen?fout=weg', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/nieuw', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{draft}', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{draft}?gedaan=ongewijzigd', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{draft}/voorbeeld', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/voorbeeld', status: 200 },
  // The versions: the published article has three, the newest equal to the article. A draft
  // made without the admin has none, and a number the article never had is "niet gevonden".
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/versies/1', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/versies/2', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/versies/3', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/versies/4', status: 404 },
  { admin: 'beheerder', path: '/beheer/artikelen/{draft}/versies/1', status: 404 },
  { admin: 'beheerder', path: '/beheer/artikelen/999999', status: 404 },
  { admin: 'moderator', path: '/beheer/artikelen', status: 404 },
  { admin: 'moderator', path: '/beheer/artikelen/nieuw', status: 404 },
  { admin: 'moderator', path: '/beheer/artikelen/{published}/versies/1', status: 404 },
  // An article of the editors, and the addresses that must say "niet gevonden": a draft, an
  // article for later, an address that isn't an article and one in capitals.
  { path: `/redactie/${testArticles.published.slug}`, status: 200 },
  { path: `/redactie/${testArticles.draft.slug}`, status: 404 },
  { path: `/redactie/${testArticles.later.slug}`, status: 404 },
  { path: '/redactie/bestaat-niet', status: 404 },
  { path: `/redactie/${testArticles.published.slug.toUpperCase()}`, status: 404 },
  { path: '/bestaat-niet', status: 404 },
]

/** Puts the numbers of the made-up articles in the path. */
async function withNumbers(path: string) {
  return path.includes('{')
    ? path
        .replace('{draft}', String(await articleIdOf(testArticles.draft.slug)))
        .replace('{published}', String(await articleIdOf(testArticles.published.slug)))
    : path
}

for (const { admin, path, status } of pages) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} in ${colorScheme}${admin === undefined ? '' : ` as a ${admin}`}`, async ({
      baseURL,
      context,
      page,
    }) => {
      // The setting of the browser, as a visitor makes it in their operating system.
      await page.emulateMedia({ colorScheme })

      if (admin) {
        await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname, admin)])
      }

      const address = await withNumbers(path)
      const response = await page.goto(address)
      expect(response?.status(), `${address} must answer ${status}`).toBe(status)

      expect(await checkPage(page)).toEqual([])
    })
  }
}
