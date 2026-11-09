import { expect, test } from '@playwright/test'

import { adminCookie } from './admin'
import { articleIdOf, testArticles } from './articles'
import { earlierSeasonSlug } from './earlier-season'
import { heldMatchId } from './held-changes'
import { cupReportMatchId, matchId, playedMatchId } from './matches'

// Every screen of the admin on a phone (#618): 390 pixels wide, with touch. The pages are
// those of pages.spec.ts, which checks them with axe and for sideways scrolling at 320
// pixels; this checks what axe doesn't see: that nothing is wider than the screen, that
// what a finger must hit is at least 24 by 24 pixels (2.5.8), and that what is wider than
// the screen sits in a box that scrolls.
const screens = [
  '/beheer',
  '/beheer/inloggen',
  '/beheer/berichten',
  '/beheer/berichten?toon=niet-op-de-site&redactie=1',
  '/beheer/artikelen',
  '/beheer/artikelen/nieuw',
  '/beheer/artikelen/{draft}',
  '/beheer/artikelen/{published}/voorbeeld',
  '/beheer/artikelen/{published}/versies/1',
  '/beheer/wedstrijden',
  `/beheer/wedstrijden?seizoen=${earlierSeasonSlug()}&tonen=alles`,
  `/beheer/wedstrijden?seizoen=${earlierSeasonSlug()}&tonen=wikipedia-wacht`,
  '/beheer/wedstrijden/{match}',
  '/beheer/wedstrijden/{held}',
  '/beheer/wedstrijden/{played}/verslag',
  '/beheer/wedstrijden/{cupMatch}/verslag',
  '/beheer/wedstrijden/{played}/verslag/plakken',
  '/beheer/stadions',
  '/beheer/stadions/sv-proefdorp',
  '/beheer/clubnamen',
  '/beheer/clubnamen/sv-proefdorp',
  '/beheer/kwaliteit',
  `/beheer/kwaliteit/${earlierSeasonSlug()}/wachtende-wijzigingen`,
  '/beheer/bezoek',
]

async function withNumbers(path: string) {
  return path
    .replace('{draft}', path.includes('{draft}') ? String(await articleIdOf(testArticles.draft.slug)) : '')
    .replace('{published}', path.includes('{published}') ? String(await articleIdOf(testArticles.published.slug)) : '')
    .replace('{match}', path.includes('{match}') ? String(await matchId()) : '')
    .replace('{held}', path.includes('{held}') ? String(await heldMatchId()) : '')
    .replace('{played}', path.includes('{played}') ? String(await playedMatchId()) : '')
    .replace('{cupMatch}', path.includes('{cupMatch}') ? String(await cupReportMatchId()) : '')
}

test.use({ hasTouch: true, isMobile: true, viewport: { height: 780, width: 390 } })

for (const path of screens) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} fits a phone in ${colorScheme}`, async ({ baseURL, context, page }) => {
      await page.emulateMedia({ colorScheme })
      await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname, 'beheerder')])
      await page.goto(await withNumbers(path))
      await page.evaluate(() => {
        for (const details of document.querySelectorAll('details')) {
          details.open = true
        }
      })

      const found = await page.evaluate(() => {
        const problems: string[] = []
        const width = document.documentElement.clientWidth
        const name = (element: Element) =>
          `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(' ')[0]}` : ''} "${(element.textContent ?? '').trim().slice(0, 30)}"`

        if (document.documentElement.scrollWidth > width) {
          problems.push(`page is ${document.documentElement.scrollWidth - width} px too wide`)
        }

        // Anything that sticks out to the right of the screen, unless a scroll box holds it.
        for (const element of document.body.querySelectorAll('*')) {
          const box = element.getBoundingClientRect()

          if (box.width === 0 || box.right <= width + 1) {
            continue
          }

          let parent = element.parentElement
          let held = false

          while (parent && parent !== document.body) {
            if (/(auto|scroll|hidden)/.test(getComputedStyle(parent).overflowX)) {
              held = true
              break
            }
            parent = parent.parentElement
          }

          if (!held) {
            problems.push(`${name(element)} ends ${Math.round(box.right - width)} px past the screen`)
          }
        }

        // A box that scrolls sideways must show that it does. The row of shortcuts is the only
        // one, and it fades at the edge where more is hidden.
        for (const element of document.body.querySelectorAll('*')) {
          if (
            element.scrollWidth > element.clientWidth + 1 &&
            /(auto|scroll)/.test(getComputedStyle(element).overflowX) &&
            !element.classList.contains('hf-page-shortcuts-row')
          ) {
            problems.push(`${name(element)} scrolls sideways without a sign of it`)
          }
        }

        // Targets: at least 24 by 24 pixels.
        const targets = [
          ...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary'),
        ].filter((element) => {
          const box = element.getBoundingClientRect()
          // Text links in a sentence are exempt (2.5.8 inline).
          return box.width > 0 && box.height > 0 && getComputedStyle(element).display !== 'inline'
        })

        for (const element of targets) {
          const box = element.getBoundingClientRect()

          if (box.width >= 24 && box.height >= 24) {
            continue
          }
          problems.push(`${name(element)} is ${Math.round(box.width)}x${Math.round(box.height)}`)
        }

        return problems
      })

      expect(found).toEqual([])
    })
  }
}
