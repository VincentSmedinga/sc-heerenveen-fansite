import { expect, test } from '@playwright/test'

import { adminCookie, type E2eRole } from './admin'
import { articleIdOf, testArticles } from './articles'
import { checkPage } from './check-page'
import { earlierSeasonSlug } from './earlier-season'
import { matchId } from './matches'

// Every page of the site, one line each, and the status code it must answer. A new page is one
// line here. An address that doesn't exist is the page "niet gevonden"; the status code also
// keeps a typo in a path from testing that page by mistake. A page with `admin` is a page of
// the admin, checked as the moderator or the beheerder that the global setup logs in (see
// admin.ts).
// `{draft}` and `{published}` in a path stand for the number of the made-up draft and the
// made-up published article, and `{match}` for the first made-up match of this season that
// is still to be played, which the database gives.
const pages: { admin?: E2eRole; path: string; status: number }[] = [
  { path: '/', status: 200 },
  // The news archive: all sources, one source, more sources, the second page (the made-up
  // headlines fill more than one page), and the addresses that say "niet gevonden": an unknown
  // source, a source given twice and a page that is wrong.
  { path: '/nieuws', status: 200 },
  { path: '/nieuws?bron=testkrant', status: 200 },
  { path: '/nieuws?bron=testkrant&bron=proefnieuws', status: 200 },
  { path: '/nieuws?bron=proefnieuws&bron=testkrant&bron=voorbeeldkrant', status: 200 },
  { path: '/nieuws?bron=testkrant&bron=testkrant', status: 404 },
  { path: '/nieuws?bron=testkrant&bron=bestaat-niet', status: 404 },
  { path: '/nieuws?pagina=2', status: 200 },
  { path: '/nieuws?bron=testkrant&pagina=99999', status: 404 },
  { path: '/nieuws?bron=bestaat-niet', status: 404 },
  { path: '/nieuws?pagina=99999', status: 404 },
  { path: '/nieuws?pagina=0', status: 404 },
  { path: '/wedstrijden', status: 200 },
  // The matches of an earlier season (made up, see earlier-season.ts), the route behind the
  // season picker, which sends the visitor on, and the addresses that say "niet gevonden": a
  // season in the future and an address that is no season. The route and the address of the
  // current season end on /wedstrijden, which answers 200.
  { path: `/wedstrijden/${earlierSeasonSlug()}`, status: 200 },
  { path: `/wedstrijden/kies?seizoen=${earlierSeasonSlug()}`, status: 200 },
  { path: '/wedstrijden/kies?seizoen=onzin', status: 200 },
  { path: '/wedstrijden/kies', status: 200 },
  { path: '/wedstrijden/2099-00', status: 404 },
  { path: '/wedstrijden/onzin', status: 404 },
  // The statistics of the current season, of an earlier season, the route behind the season
  // picker and the addresses that say "niet gevonden", as for Wedstrijden above.
  { path: '/statistieken', status: 200 },
  { path: `/statistieken/${earlierSeasonSlug()}`, status: 200 },
  { path: `/statistieken/kies?seizoen=${earlierSeasonSlug()}`, status: 200 },
  { path: '/statistieken/kies?seizoen=onzin', status: 200 },
  { path: '/statistieken/kies', status: 200 },
  { path: '/statistieken/2099-00', status: 404 },
  { path: '/statistieken/onzin', status: 404 },
  // The page Spelers of Statistieken, with the same set of addresses.
  { path: '/statistieken/spelers', status: 200 },
  { path: `/statistieken/spelers/${earlierSeasonSlug()}`, status: 200 },
  { path: `/statistieken/spelers/kies?seizoen=${earlierSeasonSlug()}`, status: 200 },
  { path: '/statistieken/spelers/kies?seizoen=onzin', status: 200 },
  { path: '/statistieken/spelers/kies', status: 200 },
  { path: '/statistieken/spelers/2099-00', status: 404 },
  { path: '/statistieken/spelers/onzin', status: 404 },
  // The page Tegenstanders: the list, a club met in the league (Testdorp FC), one with two
  // names of its stadium (Voorbeeld United) and one met in the cup only (FC Maquette, who is
  // not in the list with the choice Eredivisie and has a sentence on its page), the choice, and
  // the addresses that say "niet gevonden": a slug no club has, a choice that is not known, and
  // a path below a club.
  { path: '/statistieken/tegenstanders', status: 200 },
  { path: '/statistieken/tegenstanders?competitie=eredivisie', status: 200 },
  { path: '/statistieken/tegenstanders?competitie=onzin', status: 404 },
  { path: '/statistieken/tegenstanders/testdorp-fc', status: 200 },
  { path: '/statistieken/tegenstanders/testdorp-fc?competitie=eredivisie', status: 200 },
  { path: '/statistieken/tegenstanders/voorbeeld-united', status: 200 },
  { path: '/statistieken/tegenstanders/fc-maquette', status: 200 },
  { path: '/statistieken/tegenstanders/fc-maquette?competitie=eredivisie', status: 200 },
  { path: '/statistieken/tegenstanders/testdorp-fc?competitie=onzin', status: 404 },
  { path: '/statistieken/tegenstanders/bestaat-niet', status: 404 },
  { path: '/statistieken/tegenstanders/testdorp-fc/extra', status: 404 },
  // The choice between all the matches and the Eredivisie, on both pages: `eredivisie` is the
  // only value, and anything else or the same twice says "niet gevonden". The route behind the
  // season picker keeps the choice, and drops a value it does not know.
  { path: '/statistieken?competitie=eredivisie', status: 200 },
  { path: `/statistieken/${earlierSeasonSlug()}?competitie=eredivisie`, status: 200 },
  { path: '/statistieken?competitie=onzin', status: 404 },
  { path: '/statistieken?competitie=eredivisie&competitie=eredivisie', status: 404 },
  { path: `/statistieken/kies?seizoen=${earlierSeasonSlug()}&competitie=eredivisie`, status: 200 },
  { path: '/statistieken/spelers?competitie=eredivisie', status: 200 },
  { path: '/statistieken/spelers?competitie=onzin', status: 404 },
  { path: `/statistieken/spelers/kies?seizoen=${earlierSeasonSlug()}&competitie=eredivisie`, status: 200 },
  // The podcasts: all, one (with the card about it), both (which is all), the second page, and
  // the addresses that say "niet gevonden": an unknown podcast, a podcast given twice and a
  // page that is wrong.
  { path: '/nieuws/podcasts', status: 200 },
  { path: '/nieuws/podcasts?podcast=testpodcast', status: 200 },
  { path: '/nieuws/podcasts?podcast=proefpodcast&podcast=testpodcast', status: 200 },
  { path: '/nieuws/podcasts?podcast=testpodcast&podcast=testpodcast', status: 404 },
  { path: '/nieuws/podcasts?podcast=testpodcast&podcast=bestaat-niet', status: 404 },
  { path: '/nieuws/podcasts?pagina=2', status: 200 },
  { path: '/nieuws/podcasts?podcast=testpodcast&pagina=2', status: 200 },
  { path: '/nieuws/podcasts?podcast=bestaat-niet', status: 404 },
  { path: '/nieuws/podcasts?pagina=99', status: 404 },
  { path: '/nieuws/podcasts?pagina=0', status: 404 },
  // The old addresses of the podcasts and the search are gone, without a redirect.
  { path: '/podcasts', status: 404 },
  { path: '/zoeken', status: 404 },
  // The search, without a search, with results (a headline, an episode and an article), with
  // more results than the first ten, without results, and with a search that is not allowed.
  { path: '/nieuws/zoeken', status: 200 },
  { path: '/nieuws/zoeken?q=heerenveen', status: 200 },
  { path: '/nieuws/zoeken?q=de', status: 200 },
  { path: '/nieuws/zoeken?q=de&aantal=15', status: 200 },
  { path: '/nieuws/zoeken?q=bestaat+echt+niet', status: 200 },
  { path: '/nieuws/zoeken?q=a', status: 200 },
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
  // The numbers of the visit are for a beheerder. A moderator gets "niet gevonden".
  // The matches are for a beheerder: the list, the notice for a match that is gone, the form of
  // a match with and without a notice, and the addresses that say "niet gevonden".
  { admin: 'beheerder', path: '/beheer/wedstrijden', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden?fout=weg', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{match}', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{match}?gedaan=ongewijzigd', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/999999', status: 404 },
  { admin: 'moderator', path: '/beheer/wedstrijden', status: 404 },
  { admin: 'moderator', path: '/beheer/wedstrijden/{match}', status: 404 },
  { admin: 'beheerder', path: '/beheer/bezoek', status: 200 },
  { admin: 'moderator', path: '/beheer/bezoek', status: 404 },
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
        .replace('{match}', path.includes('{match}') ? String(await matchId()) : '{match}')
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
