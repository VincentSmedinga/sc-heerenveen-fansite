import { expect, test } from '@playwright/test'

import { earlierSeasonSlug } from './earlier-season'

const slug = earlierSeasonSlug()

// The pages that have a season in their address, and the base address of each: the address of
// the current season. A visitor in an earlier season must stay in it when a link takes them to
// another of these pages, so a link to a base address (or to the page of another season) is a
// link that drops the season. Tegenstanders counts all seasons, so it is not one of them.
const seasonPages = ['/wedstrijden', '/cijfers', '/spelers', '/spelers/cijfers']
const pathsInSeason = seasonPages.map((base) => `${base}/${slug}`)

test.describe('the links between the pages of a season', () => {
  test.use({ javaScriptEnabled: false })

  for (const path of pathsInSeason) {
    test(`keep the season on every link from ${path} to another page of a season`, async ({ page }) => {
      await page.goto(path)

      // The card Onze plek door de jaren links to every season on purpose, whichever season the
      // page shows (#776), so its links are no links that drop the season.
      const hrefs = await page
        .locator('a[href]:not(section[aria-labelledby="onze-plek-door-de-jaren"] a)')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')))
      const toSeasonPages = hrefs
        .filter((href): href is string => href !== null && href.startsWith('/'))
        .map((href) => new URL(href, 'http://example.test').pathname)
        .filter((target) => seasonPages.some((base) => target === base || target.startsWith(`${base}/`)))
        // The addresses of the picker, the search for a match and Tegenstanders start with the
        // same words, but are not pages of a season.
        .filter(
          (target) =>
            !target.endsWith('/kies') && target !== '/wedstrijden/zoeken' && !target.startsWith('/tegenstanders'),
        )
        // The page of a player is `/spelers/<name>`: a name, not a season (#1087).
        .filter((target) => !/^\/spelers\/(?!\d{4}-\d{2}$|cijfers(?:\/|$))/u.test(target))

      // The menu alone links to two other pages of a season, so the walk cannot pass by finding
      // nothing.
      expect(toSeasonPages.length).toBeGreaterThanOrEqual(2)
      expect(toSeasonPages.filter((target) => !target.endsWith(`/${slug}`))).toEqual([])
    })
  }

  test('takes a click on Wedstrijden in the menu and on Cijfers in its bar to the pages of the same season', async ({
    page,
  }) => {
    const menu = page.getByRole('navigation', { name: 'Hoofdmenu' })

    await page.goto(`/spelers/${slug}`)
    await menu.getByRole('link', { name: 'Wedstrijden' }).click()
    await expect(page).toHaveURL(new RegExp(`/wedstrijden/${slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wedstrijden')

    await menu.getByRole('link', { exact: true, name: 'Cijfers' }).click()
    await expect(page).toHaveURL(new RegExp(`/cijfers/${slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cijfers')
  })
})
