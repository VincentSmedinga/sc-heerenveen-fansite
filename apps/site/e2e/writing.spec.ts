import { expect, test } from '@playwright/test'

import { adminCookie } from './admin'
import { checkPage } from './check-page'
import { matchId } from './matches'

// Writes an article in the admin from start to end, as the beheerder of the global setup: a
// draft that errors can't lose, the preview, publishing, saving a change, and withdrawing, once
// with JavaScript and once without. The forms are plain posts, so both have to work. This
// check publishes an article, so playwright.config.ts runs it after all the others (project
// chromium-writing). It also fills in a made-up match from start to end and takes the entry
// away again: it changes a match that the other checks read.

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ baseURL, context }) => {
  await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname, 'beheerder')])
})

/**
 * A made-up text of the shape of a real article, long enough to be a test of a launch article:
 * headings, a list, bold, italic, a link to our own page and one to another site, accents,
 * quotes and an ampersand. About 12,000 characters.
 */
const body = [
  '## Wie zijn wij?',
  'Wij zijn de **redactie** van de Fansite. We schrijven niet over wat anderen al schreven, maar we wijzen je de weg naar de *journalistiek* zelf. Lees ook [onze bronnen](/bronnen).',
  `${'Een lange alinea met ëxtra accenten, “aanhalingstekens”, ‘enkele’ tekens, een euroteken (€) en een & erin. '.repeat(40)}`,
  '## Wat je van ons mag verwachten',
  '- Altijd de bron erbij\n- Een link naar het hele verhaal, zoals [de Leeuwarder Courant](https://www.lc.nl/sport?a=1&b=2)\n- Geen **advertenties** en geen volgers',
  `${'Nog een alinea om de tekst lang te maken, met Fryslân, Skûtsjesilen en een heel lang woord zoals Heerenveenstadionparkeerplaatsbeheerder. '.repeat(60)}`,
  'Tot slot: <b>geen HTML</b> hier, dat blijft gewone tekst.',
].join('\n\n')

for (const [name, javaScriptEnabled, slug] of [
  ['with JavaScript', true, 'e2e-schrijven-met-js'],
  ['without JavaScript', false, 'e2e-schrijven-zonder-js'],
] as const) {
  test.describe(name, () => {
    test.use({ javaScriptEnabled })

    test(`writes, previews, publishes, changes and withdraws an article ${name}`, async ({ page, request }) => {
      const title = `Verzonnen artikel ${name}`

      // The list has the button for a new article.
      await page.goto('/beheer/artikelen')
      await page.getByRole('button', { name: 'Nieuw artikel' }).click()
      await expect(page).toHaveURL(/\/beheer\/artikelen\/nieuw\??$/u)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nieuw artikel')
      await expect(page.getByLabel('Auteur', { exact: true })).toHaveValue('de redactie')

      // An empty intro and a text that is too long: the errors are in the summary and at the
      // fields, the summary has the focus, and everything that was typed is still there.
      const tooLong = 'x'.repeat(20_001)

      await page.getByLabel('Titel', { exact: true }).fill(title)
      await page.getByLabel('Tekst', { exact: true }).fill(tooLong)
      if (javaScriptEnabled) {
        // The address follows the title until the editor writes in it.
        await expect(page.getByLabel(/^Adres/u)).toHaveValue(/^verzonnen-artikel-with-javascript$/u)
      }
      await page.getByLabel(/^Adres/u).fill(slug)
      await page.getByRole('button', { name: 'Opslaan als concept' }).click()
      await expect(page.getByRole('heading', { name: 'Er is iets mis' })).toBeVisible()
      await expect(page.getByRole('link', { name: /Schrijf een intro/u })).toBeVisible()
      await expect(page.getByRole('link', { name: /De tekst is te lang/u })).toBeVisible()
      await expect(page.getByLabel('Intro', { exact: true })).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByLabel('Tekst', { exact: true })).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByLabel('Titel', { exact: true })).toHaveValue(title)
      await expect(page.getByLabel(/^Adres/u)).toHaveValue(slug)
      await expect(page.getByLabel('Tekst', { exact: true })).toHaveValue(tooLong)
      if (javaScriptEnabled) {
        await expect(page.locator('#fouten')).toBeFocused()
        // axe is a script that runs in the page, so it can't check a page without JavaScript.
        expect(await checkPage(page)).toEqual([])
      }

      // A good form saves a draft, and the text comes back as it was typed.
      await page
        .getByLabel('Intro', { exact: true })
        .fill('Een verzonnen inleiding van twee zinnen. Zo stellen we ons voor.')
      await page.getByLabel('Tekst', { exact: true }).fill(body)
      await page.getByRole('button', { name: 'Opslaan als concept' }).click()
      await expect(page.getByRole('heading', { name: 'Concept gemaakt' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Artikel bewerken')
      await expect(page.getByLabel('Tekst', { exact: true })).toHaveValue(body)
      await expect(page.getByLabel('Titel', { exact: true })).toHaveValue(title)
      await expect(page.getByLabel(/^Adres/u)).toHaveValue(slug)
      await expect(page.getByLabel(/^Adres/u)).not.toHaveAttribute('readonly', /.*/u)
      await expect(page.getByRole('button', { name: 'Intrekken' })).toHaveCount(0)
      if (javaScriptEnabled) {
        expect(await checkPage(page)).toEqual([])
      }

      const editAddress = new URL(page.url()).pathname
      const draftResponse = await request.get(`/redactie/${slug}`)

      // A draft is not on the site.
      expect(draftResponse.status()).toBe(404)
      expect(await (await request.get('/sitemap.xml')).text()).not.toContain(slug)

      // The preview shows the draft as a visitor will see it, and is never kept or indexed.
      const previewResponse = await page.goto(`${editAddress}/voorbeeld`)

      expect(previewResponse?.headers()['cache-control']).toMatch(/no-store/u)
      expect(previewResponse?.headers()['x-robots-tag']).toBe('noindex, nofollow')
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
      await expect(page.getByRole('main').getByRole('article')).toHaveCount(1)
      await expect(page.locator('article').getByRole('heading', { level: 1 })).toHaveText(title)
      await expect(page.locator('article h2')).toHaveText(['Wie zijn wij?', 'Wat je van ons mag verwachten'])
      await expect(page.locator('article li')).toHaveCount(3)
      await expect(page.locator('article').getByRole('link', { name: 'de Leeuwarder Courant' })).toHaveAttribute(
        'href',
        'https://www.lc.nl/sport?a=1&b=2',
      )
      await expect(page.locator('article')).toContainText('<b>geen HTML</b>')
      await expect(page.locator('article p:not(.hf-intro) b')).toHaveCount(0)
      if (javaScriptEnabled) {
        expect(await checkPage(page)).toEqual([])
      }

      // Publiceren saves what is on the screen and then publishes it.
      await page.goto(editAddress)
      await page.getByLabel('Intro', { exact: true }).fill('Een verzonnen inleiding, nu aangepast voor het publiceren.')
      await page.getByRole('button', { name: 'Publiceren' }).click()
      await expect(page.getByRole('heading', { name: 'Gepubliceerd' })).toBeVisible()
      await expect(page.getByLabel(/^Adres/u)).toHaveAttribute('readonly', /.*/u)
      await expect(page.getByRole('button', { name: 'Intrekken' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Publiceren' })).toHaveCount(0)
      if (javaScriptEnabled) {
        expect(await checkPage(page)).toEqual([])
      }

      // It is on the site, with the intro of the screen, and as the card on the homepage.
      await page.goto(`/redactie/${slug}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      await expect(page.getByText('Een verzonnen inleiding, nu aangepast voor het publiceren.')).toBeVisible()
      await expect(page.getByRole('link', { name: 'onze bronnen' })).toHaveAttribute('href', '/bronnen')
      expect(await (await request.get('/sitemap.xml')).text()).toContain(`/redactie/${slug}</loc>`)
      await page.goto('/')
      await expect(page.getByRole('region', { name: 'Van de redactie' }).getByRole('heading', { level: 3 })).toHaveText(
        title,
      )

      // A change is saved and is on the site at once.
      await page.goto(editAddress)
      await page.getByLabel('Titel', { exact: true }).fill(`${title}, verbeterd`)
      await page.getByRole('button', { name: 'Opslaan' }).click()
      await expect(page.getByRole('heading', { name: 'Opgeslagen' })).toBeVisible()
      await page.goto(`/redactie/${slug}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${title}, verbeterd`)

      // The versions are the draft, the intro that Publiceren saved with it, and the new title:
      // three, the newest on top and marked as current. Publishing made no version of its own.
      await page.goto(editAddress)

      const versions = page.getByRole('region', { name: 'Eerdere versies' })

      await expect(versions.getByRole('listitem')).toHaveCount(3)
      await expect(versions.getByRole('listitem').first()).toContainText('Huidige versie')
      await expect(versions.getByRole('link')).toHaveText(['Versie 3', 'Versie 2', 'Versie 1'])
      if (javaScriptEnabled) {
        expect(await checkPage(page)).toEqual([])
      }

      // The first version is the text as it was first saved, shown as a visitor would see it.
      await versions.getByRole('link', { name: 'Versie 1' }).click()
      await expect(page).toHaveURL(/\/versies\/1$/u)
      await expect(page.locator('article').getByRole('heading', { level: 1 })).toHaveText(title)
      await expect(page.locator('article')).toContainText(
        'Een verzonnen inleiding van twee zinnen. Zo stellen we ons voor.',
      )
      await expect(page.getByText('Dit is een eerdere versie.')).toBeVisible()
      await expect(page.locator('article h2')).toHaveText(['Wie zijn wij?', 'Wat je van ons mag verwachten'])
      if (javaScriptEnabled) {
        expect(await checkPage(page)).toEqual([])
      }

      // A version that the article never had is "niet gevonden".
      expect((await page.goto(`${editAddress}/versies/4`))?.status()).toBe(404)

      // Withdrawing takes it off the site and makes it a draft again.
      await page.goto(editAddress)
      await page.getByRole('button', { name: 'Intrekken' }).click()
      await expect(page.getByRole('heading', { name: 'Ingetrokken' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Eerdere versies' }).getByRole('listitem')).toHaveCount(3)
      await expect(page.getByRole('button', { name: 'Publiceren' })).toBeVisible()
      expect((await request.get(`/redactie/${slug}`)).status()).toBe(404)
      expect(await (await request.get('/sitemap.xml')).text()).not.toContain(slug)
      await page.goto('/')
      // The card is the newest published article again, a made-up one of the other checks.
      expect(await page.content()).not.toContain(title)

      // It is in the list, as a draft.
      await page.goto('/beheer/artikelen')
      await expect(page.getByRole('link', { exact: true, name: `${title}, verbeterd` })).toBeVisible()
      await expect(
        page
          .getByRole('listitem')
          .filter({ has: page.getByRole('link', { exact: true, name: `${title}, verbeterd` }) }),
      ).toContainText('Concept')
    })
  })
}

test('refuses an address that another article has, with the error at the field and the values kept', async ({
  page,
}) => {
  await page.goto('/beheer/artikelen/nieuw')
  await page.getByLabel('Titel', { exact: true }).fill('Een ander artikel met hetzelfde adres')
  await page.getByLabel(/^Adres/u).fill('e2e-schrijven-met-js')
  await page.getByLabel('Intro', { exact: true }).fill('Een intro.')
  await page.getByLabel('Tekst', { exact: true }).fill('Een tekst.')
  await page.getByRole('button', { name: 'Opslaan als concept' }).click()

  await expect(page.getByRole('link', { name: /Een ander artikel heeft dit adres al/u })).toBeVisible()
  await expect(page.getByLabel(/^Adres/u)).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('Een ander artikel met hetzelfde adres')
})

test('is for a beheerder: a moderator gets "niet gevonden", and a visitor goes to the login page', async ({
  baseURL,
  context,
  page,
}) => {
  await context.clearCookies()
  await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname, 'moderator')])

  const response = await page.goto('/beheer/artikelen')

  expect(response?.status()).toBe(404)
  await context.clearCookies()
  await page.goto('/beheer/artikelen')
  await expect(page).toHaveURL(/\/beheer\/inloggen$/u)
})

for (const [name, javaScriptEnabled] of [
  ['with JavaScript', true],
  ['without JavaScript', false],
] as const) {
  test.describe(`a match ${name}`, () => {
    test.use({ javaScriptEnabled })

    test(`is filled in, corrected and taken away ${name}`, async ({ page }) => {
      const address = `/beheer/wedstrijden/${await matchId()}`

      await page.goto(address)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wedstrijd invullen')
      await expect(page.getByText('Aangepast door de redactie')).toHaveCount(0)

      // A result of 0-1 with a goal that is not filled in: the errors are in the summary and at
      // the goal, the summary has the focus, and what was typed is still there.
      await page.getByLabel('Status', { exact: true }).selectOption('played')
      await page.locator('#uitslag-wij').fill('0')
      await page.locator('#uitslag-zij').fill('1')
      await page.getByLabel('Reden', { exact: true }).fill('Wikipedia is achter')
      await page.getByRole('button', { name: 'Doelpunt toevoegen' }).click()
      await expect(page.getByRole('heading', { level: 3, name: 'Doelpunt 1' })).toBeVisible()
      await expect(page.locator('#uitslag-zij')).toHaveValue('1')

      if (javaScriptEnabled) {
        // The focus is on the first field of the new goal.
        await expect(page.locator('#doelpunt-1-kant')).toBeFocused()
      }

      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page.locator('#fouten')).toBeVisible()
      await expect(page.getByLabel('Voor welk team, doelpunt 1', { exact: true })).toHaveAttribute(
        'aria-invalid',
        'true',
      )
      await expect(page.getByLabel('Minuut, doelpunt 1', { exact: true })).toHaveAttribute('aria-invalid', 'true')
      await expect(page.locator('#uitslag-zij')).toHaveValue('1')

      if (javaScriptEnabled) {
        await expect(page.locator('#fouten')).toBeFocused()
      }

      // The goal of the opponent, by a player we don't have: saved, with a notice.
      await page.getByLabel('Voor welk team, doelpunt 1', { exact: true }).selectOption('zij')
      await page.getByLabel('Minuut, doelpunt 1', { exact: true }).fill('40')
      await page.getByLabel('Speler, doelpunt 1', { exact: true }).selectOption('andere')
      await page.getByLabel('Naam van de andere speler, doelpunt 1').fill('Sibbing')
      if (javaScriptEnabled) {
        // The form with a goal in it, which the checks of all the pages never open.
        expect(await checkPage(page)).toEqual([])
      }
      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page).toHaveURL(/\?gedaan=opgeslagen$/u)
      await expect(page.getByRole('heading', { level: 2, name: 'Opgeslagen' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Aangepast door de redactie' })).toBeVisible()
      await expect(page.getByLabel('Minuut, doelpunt 1', { exact: true })).toHaveValue('40')

      // A goal that is taken away leaves the focus on the button that adds one.
      await page.getByRole('button', { name: 'Doelpunt 1 weghalen' }).click()
      await expect(page.getByRole('heading', { level: 3, name: 'Doelpunt 1' })).toHaveCount(0)

      if (javaScriptEnabled) {
        await expect(page.getByRole('button', { name: 'Doelpunt toevoegen' })).toBeFocused()
      }

      // The list says so in words.
      await page.goto('/beheer/wedstrijden')
      await expect(page.getByText('Aangepast door de redactie').first()).toBeVisible()

      // Taking the entry away asks for a reason, and brings the match back.
      await page.goto(address)
      await page.getByRole('button', { name: /^Invoer weghalen voor/u }).click()
      await expect(page.locator('#weghalen-reden')).toHaveAttribute('aria-invalid', 'true')
      await page.getByLabel('Reden om de invoer weg te halen').fill('Het was een test')
      await page.getByRole('button', { name: /^Invoer weghalen voor/u }).click()
      await expect(page.getByRole('heading', { level: 2, name: 'Invoer weggehaald' })).toBeVisible()
      await expect(page.getByText('Aangepast door de redactie')).toHaveCount(0)
    })
  })
}
