import { expect, type Page, test } from '@playwright/test'

import { adminCookie } from './admin'

// The switches that change the page with JavaScript: Welke stand, Welke wedstrijden (on
// Cijfers and Spelers) and Welke berichten. A plain click moves the thumb at once and the
// content follows without a new page; the links work without JavaScript, which the specs of
// each switch check (standings-switch, competition-switch). The router asks for the page
// without `Accept: text/html`, so a click is no visit for the counter (see src/visits.ts); a
// request for the whole page is.
const menu = (page: Page) => page.getByRole('navigation', { name: 'Hoofdmenu' })

type SwitchCase = {
  admin?: true
  after: RegExp
  anchor?: true
  bar?: { from: string; name: string; to: string }
  from: string
  group: string
  path: string
  to: string
}

/** The items of the menu and the bar that are the current page, with their `aria-current`. */
const currentsOfMenu = (page: Page) =>
  menu(page)
    .locator('[aria-current]')
    .evaluateAll((items) => items.map((item) => `${item.textContent}: ${item.getAttribute('aria-current')}`))

/** The text of the page without the line for a screen reader, which changes with a choice. */
const contentOf = (page: Page) =>
  page.evaluate(() => {
    const copy = document.body.cloneNode(true) as HTMLElement

    for (const status of copy.querySelectorAll('[role="status"]')) {
      status.remove()
    }

    return copy.textContent ?? ''
  })

const switches: SwitchCase[] = [
  {
    after: /\/wedstrijden\?stand=laatste-5#stand$/,
    anchor: true,
    from: 'Hele seizoen',
    group: 'Welke stand',
    path: '/wedstrijden',
    to: 'Laatste 5',
  },
  {
    after: /\/wedstrijden\/cijfers\?competitie=eredivisie$/,
    from: 'Alles',
    group: 'Welke wedstrijden',
    path: '/wedstrijden/cijfers',
    to: 'Eredivisie',
  },
  {
    after: /\/tegenstanders\?competitie=eredivisie$/,
    bar: { from: '/tegenstanders', name: 'Tegenstanders', to: '/tegenstanders?competitie=eredivisie' },
    from: 'Alles',
    group: 'Welke wedstrijden',
    path: '/tegenstanders',
    to: 'Eredivisie',
  },
  {
    after: /\/spelers\?competitie=eredivisie$/,
    from: 'Alles',
    group: 'Welke wedstrijden',
    path: '/spelers',
    to: 'Eredivisie',
  },
  {
    admin: true,
    after: /\/beheer\/berichten\?toon=niet-op-de-site$/,
    from: 'Op de site',
    group: 'Welke berichten',
    path: '/beheer/berichten',
    to: 'Niet op de site',
  },
]

/** Waits until React has hydrated the switch: before that, a click is a click on a link. */
const hydrated = (page: Page, group: string) =>
  page.waitForFunction((name) => {
    const element = document.querySelector(`[role="group"][aria-label="${name}"]`)

    return element !== null && Object.keys(element).some((key) => key.startsWith('__reactProps$'))
  }, group)

for (const { admin, after, anchor, bar, from, group, path, to } of switches) {
  test.describe(`the switch ${group} with JavaScript on ${path}`, () => {
    test.beforeEach(async ({ baseURL, context }) => {
      if (admin) {
        await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname)])
      }
    })

    test('changes the content with a click, without loading a page, and keeps the focus', async ({ page }) => {
      const requests: { accept: string; resourceType: string; url: string }[] = []

      await page.goto(path)
      await hydrated(page, group)

      const choices = page.getByRole('group', { name: group })
      const status = choices.locator('xpath=following-sibling::p[@role="status"]')
      const title = await page.title()
      const content = await contentOf(page)

      // The menu marks the page the visitor is on. The item Beheer is added by script after
      // hydrating (see SiteNavigation), so on /beheer/berichten the menu has no mark until
      // then, and a baseline taken before it would differ from the menu after the click.
      await expect(menu(page).locator('[aria-current]').first()).toBeAttached()

      const currents = await currentsOfMenu(page)
      const canonical = await page
        .locator('link[rel="canonical"]')
        .first()
        .getAttribute('href', { timeout: 1000 })
        .catch(() => null)

      await choices.scrollIntoViewIfNeeded()
      await page.evaluate(() => {
        Object.assign(window, { stillTheSamePage: true })
      })

      const before = await choices.boundingBox()

      await expect(choices.getByRole('link', { exact: true, name: from })).toHaveAttribute('aria-current', 'page')
      await expect(status).toHaveText('')
      page.on('request', async (request) => {
        requests.push({
          accept: (await request.allHeaders())['accept'] ?? '',
          resourceType: request.resourceType(),
          url: request.url(),
        })
      })

      await choices.getByRole('link', { exact: true, name: to }).click()

      await expect(page).toHaveURL(after)
      await expect(choices.getByRole('link', { exact: true, name: to })).toHaveAttribute('aria-current', 'page')
      await expect(choices.getByRole('link', { exact: true, name: from })).not.toHaveAttribute('aria-current')
      await expect(choices).not.toHaveAttribute('aria-busy')
      await expect(status).toHaveText(`${to} gekozen`)
      await expect(choices.getByRole('link', { exact: true, name: to })).toBeFocused()
      expect(await contentOf(page)).not.toBe(content)

      // The same page, with the title and the canonical link of the page without the choice.
      expect(await page.evaluate(() => 'stillTheSamePage' in window)).toBe(true)
      await expect(page).toHaveTitle(title)
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(canonical === null ? 0 : 1)
      if (canonical !== null) {
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical)
      }

      // The page did not jump: the switch is where it was.
      const now = await choices.boundingBox()

      expect(Math.abs((now?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2)

      if (anchor === true) {
        expect(page.url()).toMatch(/#stand$/)
      }

      // The counter counts a request for a whole page, which asks for HTML. The click asked for
      // no page and no request for the page asked for HTML.
      expect(requests.filter(({ resourceType }) => resourceType === 'document')).toEqual([])
      expect(
        requests.filter(({ accept, url }) => new URL(url).pathname === path && accept.includes('text/html')),
      ).toEqual([])
      expect(requests.some(({ url }) => new URL(url).pathname === path)).toBe(true)

      // The links of the bar and the menu use the choice.
      if (bar !== undefined) {
        await expect(menu(page).getByRole('link', { exact: true, name: bar.name })).toHaveAttribute('href', bar.to)
      }

      expect(await currentsOfMenu(page)).toEqual(currents)
    })

    test('goes back and forward with the history, and the thumb follows the page', async ({ page }) => {
      await page.goto(path)
      await hydrated(page, group)

      const choices = page.getByRole('group', { name: group })
      const content = await contentOf(page)
      // The text of a page can change between two requests (the clock, an item that another
      // test hides), so Back is checked with the headings, which stay.
      const headings = await page.getByRole('heading').allTextContents()

      await choices.getByRole('link', { exact: true, name: to }).click()
      await expect(page).toHaveURL(after)
      await expect(choices.getByRole('link', { exact: true, name: to })).toHaveAttribute('aria-current', 'page')
      expect(await contentOf(page)).not.toBe(content)

      await page.goBack()
      await expect(choices.getByRole('link', { exact: true, name: from })).toHaveAttribute('aria-current', 'page')
      await expect(choices.getByRole('link', { exact: true, name: to })).not.toHaveAttribute('aria-current')
      await expect.poll(() => page.getByRole('heading').allTextContents()).toEqual(headings)

      await page.goForward()
      await expect(page).toHaveURL(after)
      await expect(choices.getByRole('link', { exact: true, name: to })).toHaveAttribute('aria-current', 'page')
    })

    test('works with the keyboard, and leaves a click with Ctrl to the link', async ({ page }) => {
      await page.goto(path)
      await hydrated(page, group)

      const choices = page.getByRole('group', { name: group })
      const address = page.url()

      await choices.getByRole('link', { exact: true, name: to }).click({ modifiers: ['ControlOrMeta'] })
      await expect(choices.getByRole('link', { exact: true, name: from })).toHaveAttribute('aria-current', 'page')
      expect(page.url()).toBe(address)

      await choices.getByRole('link', { exact: true, name: from }).focus()
      await page.keyboard.press('Tab')
      await expect(choices.getByRole('link', { exact: true, name: to })).toBeFocused()
      await page.keyboard.press('Enter')

      await expect(page).toHaveURL(after)
      await expect(choices.getByRole('link', { exact: true, name: to })).toHaveAttribute('aria-current', 'page')
      await expect(choices.getByRole('link', { exact: true, name: to })).toBeFocused()
    })

    test('slides the thumb at once, before the page has answered', async ({ context, page }) => {
      await page.goto(path)
      await hydrated(page, group)
      // Holds back the answer of the server for a moment, as a slow connection does.
      await context.route(
        (url) => url.pathname === path && url.search !== '',
        async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 600))
          await route.continue()
        },
      )

      const choices = page.getByRole('group', { name: group })

      await choices.getByRole('link', { exact: true, name: to }).click()

      await expect(choices.getByRole('link', { exact: true, name: to })).toHaveAttribute('aria-current', 'page', {
        timeout: 300,
      })
      await expect(choices).toHaveAttribute('aria-busy', 'true', { timeout: 300 })
      expect(page.url()).not.toMatch(after)

      await expect(page).toHaveURL(after)
      await expect(choices).not.toHaveAttribute('aria-busy')
    })
  })
}
