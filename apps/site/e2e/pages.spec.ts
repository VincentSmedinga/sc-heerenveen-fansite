import { expect, test } from '@playwright/test'

import { adminCookie } from './admin'
import { checkPage } from './check-page'

// Every page of the site, one line each, and the status code it must answer. A new page is one line here. An address that
// doesn't exist is the page "niet gevonden"; the status code also keeps a typo in a path from testing that page by mistake.
// A page with `admin: true` is a page of the admin, checked as the moderator that the global setup logs in (see admin.ts).
const pages: { admin?: true; path: string; status: number }[] = [
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
  // The way in to the admin. The admin itself is no page for a visitor without a session: it goes to the login page.
  { path: '/beheer/inloggen', status: 200 },
  { path: '/beheer/inloggen?fout=ongeldig', status: 200 },
  { path: '/beheer/inloggen?fout=link', status: 200 },
  { path: '/beheer/inloggen/verstuurd', status: 200 },
  { path: '/beheer/inloggen/bevestigen?token=onbekend', status: 200 },
  // The admin, as a moderator who is logged in: the start page, the list of items, a search with a result and without one.
  { admin: true, path: '/beheer', status: 200 },
  { admin: true, path: '/beheer/berichten', status: 200 },
  { admin: true, path: '/beheer/berichten?q=Verzonnen', status: 200 },
  { admin: true, path: '/beheer/berichten?q=bestaat+niet', status: 200 },
  { admin: true, path: '/beheer/berichten?fout=weg', status: 200 },
  { path: '/bestaat-niet', status: 404 },
]

for (const { admin, path, status } of pages) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} in ${colorScheme}`, async ({ baseURL, context, page }) => {
      // The setting of the browser, as a visitor makes it in their operating system.
      await page.emulateMedia({ colorScheme })

      if (admin) {
        await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname)])
      }

      const response = await page.goto(path)
      expect(response?.status(), `${path} must answer ${status}`).toBe(status)

      expect(await checkPage(page)).toEqual([])
    })
  }
}
