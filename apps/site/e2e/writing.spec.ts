import { expect, type Page, test } from '@playwright/test'

import { adminCookie } from './admin'
import { checkPage } from './check-page'
import { earlierSeasonSlug } from './earlier-season'
import { liveReportMatchId } from './live-report'
import { matchId, playedMatchId } from './matches'

// Writes an article in the admin from start to end, with the editor, as the beheerder of the
// global setup: a draft that errors can't lose, the preview, publishing, saving a change, and
// withdrawing. Writing needs JavaScript; reading does not, so the published article is read
// once without. This check publishes an article, so playwright.config.ts runs it after all the
// others (project chromium-writing). It also fills in a made-up match from start to end and
// takes the entry away again: it changes a match that the other checks read.

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ baseURL, context }) => {
  await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname, 'beheerder')])
})

/** The editor for the text, which is a textbox with the label Tekst. */
const editorOf = (page: Page) => page.getByRole('textbox', { exact: true, name: 'Tekst' })

/** Makes a link in the editor with the small form under the toolbar. */
async function addLink(page: Page, address: string, words: string) {
  await page.getByRole('toolbar', { name: 'Opmaak' }).getByRole('button', { name: 'Link' }).click()
  await page.getByRole('group', { name: 'Link' }).getByLabel('Adres', { exact: true }).fill(address)
  await page.getByLabel('Tekst van de link', { exact: true }).fill(words)
  await page.getByRole('button', { name: 'Link opslaan' }).click()
  await expect(editorOf(page)).toBeFocused()
}

/**
 * Presses a button of the toolbar and waits until the focus is back in the editor, which takes
 * a frame. Text that is typed before that goes to the button.
 */
async function tool(page: Page, name: string) {
  await page.getByRole('toolbar', { name: 'Opmaak' }).getByRole('button', { name }).click()
  await expect(editorOf(page)).toBeFocused()
}

/**
 * Writes a made-up text of the shape of a real article, long enough to be a test of a launch
 * article, with the keyboard and the toolbar: headings, a list, bold, italic, a link to our own
 * page and one to another site, accents, quotes and an ampersand. About 12,000 characters.
 */
async function writeBody(page: Page) {
  const bold = 'ControlOrMeta+b'
  const italic = 'ControlOrMeta+i'

  await editorOf(page).click()
  await tool(page, 'Kop')
  await page.keyboard.type('Wie zijn wij?')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Wij zijn de ')
  await page.keyboard.press(bold)
  await page.keyboard.type('redactie')
  await page.keyboard.press(bold)
  await page.keyboard.type(' van de Fansite. We wijzen je de weg naar de ')
  await page.keyboard.press(italic)
  await page.keyboard.type('journalistiek')
  await page.keyboard.press(italic)
  await page.keyboard.type(' zelf. Lees ook ')
  await addLink(page, '/bronnen', 'onze bronnen')
  await page.keyboard.type('.')
  await page.keyboard.press('Enter')
  await page.keyboard.insertText(
    'Een lange alinea met ëxtra accenten, “aanhalingstekens”, ‘enkele’ tekens, een euroteken (€) en een & erin. '.repeat(
      40,
    ),
  )
  await page.keyboard.press('Enter')
  await tool(page, 'Kop')
  await page.keyboard.type('Wat je van ons mag verwachten')
  await page.keyboard.press('Enter')
  await tool(page, 'Lijst')
  await page.keyboard.type('Altijd de bron erbij')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Een link naar het hele verhaal, zoals ')
  await addLink(page, 'https://www.lc.nl/sport?a=1&b=2', 'de Leeuwarder Courant')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Geen ')
  await page.keyboard.press(bold)
  await page.keyboard.type('advertenties')
  await page.keyboard.press(bold)
  await page.keyboard.type(' en geen volgers')
  // A second Enter in an empty item leaves the list.
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.insertText(
    'Nog een alinea om de tekst lang te maken, met Fryslân, Skûtsjesilen en een heel lang woord zoals Heerenveenstadionparkeerplaatsbeheerder. '.repeat(
      60,
    ),
  )
  await page.keyboard.press('Enter')
  await page.keyboard.insertText('Tot slot: <b>geen HTML</b> hier, dat blijft gewone tekst.')
}

test.describe('with JavaScript', () => {
  const slug = 'e2e-schrijven-met-js'
  const title = 'Verzonnen artikel met JavaScript'

  test('writes, previews, publishes, changes and withdraws an article with the editor', async ({
    browser,
    page,
    request,
  }) => {
    // The list has the button for a new article.
    await page.goto('/beheer/artikelen')
    await page.getByRole('button', { name: 'Nieuw artikel' }).click()
    await expect(page).toHaveURL(/\/beheer\/artikelen\/nieuw\??$/u)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nieuw artikel')
    await expect(page.getByLabel('Auteur', { exact: true })).toHaveValue('de redactie')

    // An empty intro and a text that is too long: the errors are in the summary and at the
    // fields, the summary has the focus, and everything that was typed is still there.
    await page.getByLabel('Titel', { exact: true }).fill(title)
    await editorOf(page).click()
    await page.keyboard.insertText('x'.repeat(20_001))
    // The address follows the title until the editor writes in it.
    await expect(page.getByLabel(/^Adres/u)).toHaveValue(/^verzonnen-artikel-met-javascript$/u)
    await page.getByLabel(/^Adres/u).fill(slug)
    await page.getByRole('button', { name: 'Opslaan als concept' }).click()
    await expect(page.getByRole('heading', { name: 'Er is iets mis' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Schrijf een intro/u })).toBeVisible()
    await expect(page.getByRole('link', { name: /De tekst is te lang/u })).toBeVisible()
    await expect(page.getByLabel('Intro', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    await expect(editorOf(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Titel', { exact: true })).toHaveValue(title)
    await expect(page.getByLabel(/^Adres/u)).toHaveValue(slug)
    await expect(editorOf(page)).toContainText('x'.repeat(100))
    await expect(page.locator('#fouten')).toBeFocused()
    expect(await checkPage(page)).toEqual([])

    // The link in the summary leads to the editor.
    await page.getByRole('link', { name: /De tekst is te lang/u }).click()
    await expect(editorOf(page)).toBeFocused()

    // A good form saves a draft, and the text comes back as it was written.
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Backspace')
    await page
      .getByLabel('Intro', { exact: true })
      .fill('Een verzonnen inleiding van twee zinnen. Zo stellen we ons voor.')
    await writeBody(page)
    await page.getByRole('button', { name: 'Opslaan als concept' }).click()
    await expect(page.getByRole('heading', { name: 'Concept gemaakt' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Artikel bewerken')
    await expect(editorOf(page).locator('h2')).toHaveText(['Wie zijn wij?', 'Wat je van ons mag verwachten'])
    await expect(editorOf(page).locator('li')).toHaveCount(3)
    await expect(editorOf(page).locator('a', { hasText: 'onze bronnen' })).toBeVisible()
    await expect(editorOf(page)).toContainText('<b>geen HTML</b>')
    await expect(page.getByLabel('Titel', { exact: true })).toHaveValue(title)
    await expect(page.getByLabel(/^Adres/u)).toHaveValue(slug)
    await expect(page.getByLabel(/^Adres/u)).not.toHaveAttribute('readonly', /.*/u)
    await expect(page.getByRole('button', { name: 'Intrekken' })).toHaveCount(0)
    expect(await checkPage(page)).toEqual([])

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
    await expect(page.locator('article strong')).toHaveText(['redactie', 'advertenties'])
    await expect(page.locator('article em')).toHaveText(['journalistiek'])
    await expect(page.locator('article').getByRole('link', { name: 'de Leeuwarder Courant' })).toHaveAttribute(
      'href',
      'https://www.lc.nl/sport?a=1&b=2',
    )
    await expect(page.locator('article')).toContainText('<b>geen HTML</b>')
    await expect(page.locator('article p:not(.hf-intro) b')).toHaveCount(0)
    expect(await checkPage(page)).toEqual([])

    // Publiceren saves what is on the screen and then publishes it.
    await page.goto(editAddress)
    await page.getByLabel('Intro', { exact: true }).fill('Een verzonnen inleiding, nu aangepast voor het publiceren.')
    await page.getByRole('button', { name: 'Publiceren' }).click()
    await expect(page.getByRole('heading', { name: 'Gepubliceerd' })).toBeVisible()
    await expect(page.getByLabel(/^Adres/u)).toHaveAttribute('readonly', /.*/u)
    await expect(page.getByRole('button', { name: 'Intrekken' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publiceren' })).toHaveCount(0)
    expect(await checkPage(page)).toEqual([])

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

    // A visitor reads it without JavaScript, as before.
    const reader = await browser.newContext({ javaScriptEnabled: false })
    const readerPage = await reader.newPage()

    await readerPage.goto(new URL(`/redactie/${slug}`, page.url()).href)
    await expect(readerPage.locator('article h2')).toHaveText(['Wie zijn wij?', 'Wat je van ons mag verwachten'])
    await expect(readerPage.locator('article li')).toHaveCount(3)
    await reader.close()

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
    expect(await checkPage(page)).toEqual([])

    // The first version is the text as it was first saved, shown as a visitor would see it.
    await versions.getByRole('link', { name: 'Versie 1' }).click()
    await expect(page).toHaveURL(/\/versies\/1$/u)
    await expect(page.locator('article').getByRole('heading', { level: 1 })).toHaveText(title)
    await expect(page.locator('article')).toContainText(
      'Een verzonnen inleiding van twee zinnen. Zo stellen we ons voor.',
    )
    await expect(page.getByText('Dit is een eerdere versie.')).toBeVisible()
    await expect(page.locator('article h2')).toHaveText(['Wie zijn wij?', 'Wat je van ons mag verwachten'])
    expect(await checkPage(page)).toEqual([])

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
      page.getByRole('listitem').filter({ has: page.getByRole('link', { exact: true, name: `${title}, verbeterd` }) }),
    ).toContainText('Concept')
  })
})

test('refuses an address that another article has, with the error at the field and the values kept', async ({
  page,
}) => {
  await page.goto('/beheer/artikelen/nieuw')
  await page.getByLabel('Titel', { exact: true }).fill('Een ander artikel met hetzelfde adres')
  await page.getByLabel(/^Adres/u).fill('e2e-schrijven-met-js')
  await page.getByLabel('Intro', { exact: true }).fill('Een intro.')
  await editorOf(page).fill('Een tekst.')
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
      await expect(page.getByRole('heading', { level: 1 })).toContainText(' - ')
      await expect(page.getByRole('navigation', { name: 'Kruimelpad' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Laatste invoer' })).toHaveCount(0)

      // A result of 0-1 asks for one goal.
      await page.getByLabel('Status', { exact: true }).selectOption('played')
      await page.locator('#uitslag-wij').fill('0')
      await page.locator('#uitslag-zij').fill('1')
      await page.getByLabel('Reden', { exact: true }).fill('Wikipedia is achter')

      if (javaScriptEnabled) {
        // The form has the goal already. A goal that is added comes after it, with the focus.
        await expect(page.locator('#doelpunt-1-kant')).toBeVisible()
        await page.getByRole('button', { name: 'Doelpunt toevoegen' }).click()
        await expect(page.locator('#doelpunt-2-minuut')).toBeFocused()
        // A goal that is taken away leaves the focus on the button that adds one.
        await page.getByRole('button', { name: 'Doelpunt 2 weghalen' }).click()
        await expect(page.locator('#doelpunt-2-kant')).toHaveCount(0)
        await expect(page.getByRole('button', { name: 'Doelpunt toevoegen' })).toBeFocused()
      } else {
        await page.getByRole('button', { name: 'Doelpunt toevoegen' }).click()
      }

      await expect(page.locator('#doelpunt-1-kant')).toBeVisible()
      await expect(page.locator('#uitslag-zij')).toHaveValue('1')

      // A goal with only the added time filled in: the errors are in the summary and at the
      // goal, the summary has the focus, and what was typed is still there.
      await page.getByLabel('Blessuretijd, doelpunt 1', { exact: true }).fill('1')
      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page.locator('#fouten')).toBeVisible()
      await expect(page.locator('#doelpunt-1-kant-error')).toBeVisible()
      // The minute may be empty, but not with added time: the error is at the added time.
      await expect(page.getByLabel('Blessuretijd, doelpunt 1', { exact: true })).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByLabel('Minuut, doelpunt 1', { exact: true })).not.toHaveAttribute('aria-invalid', 'true')
      await expect(page.locator('#uitslag-zij')).toHaveValue('1')
      await expect(page.getByLabel('Blessuretijd, doelpunt 1', { exact: true })).toHaveValue('1')

      if (javaScriptEnabled) {
        await expect(page.locator('#fouten')).toBeFocused()
      }

      // The goal of the opponent, by a player we don't have: saved, with a notice.
      await page.locator('input[name="doelpunt-1-kant"][value="zij"]').check()
      await page.getByLabel('Minuut, doelpunt 1', { exact: true }).fill('40')

      if (!javaScriptEnabled) {
        // Without JavaScript the field for the name shows when the form comes back.
        await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
        await expect(page.locator('#doelpunt-1-naam-error')).toBeVisible()
      }

      await expect(page.getByLabel('Speler, doelpunt 1', { exact: true })).toBeHidden()
      await page.getByLabel('Andere speler, doelpunt 1').fill('Sibbing')
      if (javaScriptEnabled) {
        // The form with a goal in it, which the checks of all the pages never open.
        expect(await checkPage(page)).toEqual([])
      }
      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page).toHaveURL(/\?gedaan=opgeslagen$/u)
      await expect(page.getByRole('status').filter({ hasText: 'Opgeslagen.' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Laatste invoer' })).toBeVisible()
      await expect(page.getByLabel('Minuut, doelpunt 1', { exact: true })).toHaveValue('40')

      // A goal that is taken away is gone: the form does not make a new row for it.
      await page.getByRole('button', { name: 'Doelpunt 1 weghalen' }).click()
      await expect(page.locator('#doelpunt-1-kant')).toHaveCount(0)

      if (javaScriptEnabled) {
        await expect(page.getByRole('button', { name: 'Doelpunt toevoegen' })).toBeFocused()
      }

      // The list says so in words.
      await page.goto('/beheer/wedstrijden?tonen=aangepast')
      await expect(page.getByText('Aangepast', { exact: true }).first()).toBeVisible()

      // Taking the entry away asks for a reason, and brings the match back.
      await page.goto(address)
      await page.locator('summary', { hasText: 'Invoer weghalen' }).click()
      await page.getByRole('button', { name: /^Invoer weghalen voor/u }).click()
      await expect(page.locator('#weghalen-reden')).toHaveAttribute('aria-invalid', 'true')
      await page.getByLabel('Reden om de invoer weg te halen').fill('Het was een test')
      await page.getByRole('button', { name: /^Invoer weghalen voor/u }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Invoer weggehaald.' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Laatste invoer' })).toHaveCount(0)
    })
  })
}

for (const [name, javaScriptEnabled] of [
  ['with JavaScript', true],
  ['without JavaScript', false],
] as const) {
  test.describe(`a match report ${name}`, () => {
    test.use({ javaScriptEnabled })

    test(`is filled in, saved as bezig and taken away ${name}`, async ({ page }) => {
      const address = `/beheer/wedstrijden/${await playedMatchId()}/verslag`

      await page.goto(address)
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Verslag: ')
      await expect(page.getByRole('navigation', { name: 'Kruimelpad' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Gegevens' })).toBeVisible()
      await expect(page.locator('summary', { hasText: 'Verslag weghalen' })).toHaveCount(0)

      // The source says in one sentence what belongs in it.
      await expect(page.getByText('nooit tekst van een verslag', { exact: false })).toBeVisible()
      await page.getByLabel('Bron', { exact: true }).fill('wedstrijdformulier')

      // A player of the opponent: the button adds a row, with the focus on its first field.
      await page.locator('button[value="speler-zij-toevoegen"]').click()
      await expect(page.locator('#speler-zij-1-rugnummer')).toHaveCount(1)

      if (javaScriptEnabled) {
        await expect(page.locator('#speler-zij-1-rugnummer')).toBeFocused()
      }

      // A number without a name: the error is in the summary and at the field, the summary has
      // the focus, and what was typed is still there.
      await page.getByLabel('Rugnummer, speler 1', { exact: true }).last().fill('5')
      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page.locator('#fouten')).toBeVisible()
      await expect(page.locator('#speler-zij-1-naam-error')).toBeVisible()
      await expect(page.getByLabel('Naam, speler 1', { exact: true })).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByLabel('Bron', { exact: true })).toHaveValue('wedstrijdformulier')

      if (javaScriptEnabled) {
        await expect(page.locator('#fouten')).toBeFocused()
      }

      // With the name, the report is saved as bezig. The rules still find the line-up of sc
      // Heerenveen short, which the page says.
      await page.getByLabel('Naam, speler 1', { exact: true }).fill('Verzonnen Tegenstander')
      if (javaScriptEnabled) {
        // The form with a row in it, which the checks of all the pages never open.
        expect(await checkPage(page)).toEqual([])
      }
      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page).toHaveURL(/\/verslag\?gedaan=opgeslagen$/u)
      await expect(page.getByRole('status').filter({ hasText: 'Opgeslagen.' })).toBeVisible()
      await expect(page.getByLabel('Naam, speler 1', { exact: true })).toHaveValue('Verzonnen Tegenstander')
      await expect(page.getByRole('heading', { name: 'Dit is nog niet af' })).toBeVisible()
      await expect(page.locator('summary', { hasText: 'Verslag weghalen' })).toBeVisible()

      // "Klaar" does not work yet: the report stays bezig, and says why.
      await page.getByLabel('Status', { exact: true }).selectOption('klaar')
      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page).toHaveURL(/\/verslag\?gedaan=nog-niet-klaar$/u)
      await expect(page.getByRole('status').filter({ hasText: 'Bewaard als bezig.' })).toBeVisible()

      // The list says so in words, with a link to the report.
      await page.goto(`/beheer/wedstrijden?seizoen=${earlierSeasonSlug()}&tonen=alles`)
      await expect(page.locator(`a[href="${address}"]`).first()).toContainText('Openen')

      // A row that is taken away is gone: the form does not make a new row for it.
      await page.goto(address)
      await page.getByRole('button', { name: 'Speler 1 weghalen' }).last().click()
      await expect(page.locator('#speler-zij-1-naam')).toHaveCount(0)

      // Taking the report away asks for a reason, and brings the goals back.
      await page.goto(address)
      await page.locator('summary', { hasText: 'Verslag weghalen' }).click()
      await page.getByRole('button', { name: /^Verslag weghalen voor/u }).click()
      await expect(page.locator('#verslag-weghalen-reden')).toHaveAttribute('aria-invalid', 'true')
      await page.getByLabel('Reden om het verslag weg te halen').fill('Het was een test')
      await page.getByRole('button', { name: /^Verslag weghalen voor/u }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Verslag weggehaald.' })).toBeVisible()
      await expect(page.locator('summary', { hasText: 'Verslag weghalen' })).toHaveCount(0)
    })
  })
}

for (const [name, javaScriptEnabled] of [
  ['with JavaScript', true],
  ['without JavaScript', false],
] as const) {
  test.describe(`keeping a match report up to date ${name}`, () => {
    test.use({ javaScriptEnabled })

    test(`shows Blessuretijd and the bar of the page ${name}`, async ({ page }) => {
      await page.goto(`/beheer/wedstrijden/${await liveReportMatchId()}/verslag/live`)

      const goal = page.locator('form').filter({ has: page.getByRole('button', { name: 'Doelpunt opslaan' }) })
      const stoppage = goal.getByLabel('Blessuretijd', { exact: false })

      await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Gebeurtenissen' })).toHaveAttribute('href', '#gebeurtenissen-kop')
      await expect(page.getByText('Weet je zeker')).toHaveCount(0)
      await expect(goal.getByText('Voor wie')).toBeVisible()

      if (javaScriptEnabled) {
        // It comes with the minutes 45, 90, 105 and 120 and goes again, and the focus stays.
        const minute = goal.getByLabel('Minuut', { exact: true })

        await expect(stoppage).toHaveCount(0)
        await minute.fill('45')
        await expect(stoppage).toBeVisible()
        await expect(minute).toBeFocused()
        await minute.fill('46')
        await expect(stoppage).toHaveCount(0)
        await expect(minute).toBeFocused()
      } else {
        // Without JavaScript nothing can show it when it is needed, so it is always there.
        await expect(stoppage).toBeVisible()
      }
    })

    test(`adds a goal and takes it away again ${name}`, async ({ page }) => {
      await page.goto(`/beheer/wedstrijden/${await liveReportMatchId()}/verslag/live`)
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Bijhouden: ')
      await expect(page.getByRole('heading', { level: 2, name: 'Stand 1–0' })).toBeVisible()

      // A goal without a minute is refused at the field, with what was typed kept.
      const goal = page.locator('form').filter({ has: page.getByRole('button', { name: 'Doelpunt opslaan' }) })

      await goal.getByLabel('Testdorp FC', { exact: true }).check()
      await goal.getByLabel('Naam van de speler', { exact: false }).fill('Verzonnen Aanvaller')
      await goal.getByRole('button', { name: 'Doelpunt opslaan' }).click()
      await expect(page.locator('#live-doelpunt-minuut-error')).toBeVisible()
      await expect(goal.getByLabel('Naam van de speler', { exact: false })).toHaveValue('Verzonnen Aanvaller')

      if (javaScriptEnabled) {
        await expect(page.locator('#live-doelpunt-fouten')).toBeFocused()
      }

      // With a minute it is saved at once, said politely, and the stand follows.
      await goal.getByLabel('Minuut', { exact: true }).fill('88')
      await goal.getByRole('button', { name: 'Doelpunt opslaan' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Doelpunt opgeslagen: 88e minuut' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Stand 1–1' })).toBeVisible()
      await expect(page.getByText("Doelpunt 88' Verzonnen Aanvaller", { exact: false }).first()).toBeVisible()

      if (javaScriptEnabled) {
        // The fields are empty again and the next event starts at the first field.
        await expect(page.locator('#live-doelpunt-kant')).toBeFocused()
      }

      // Taking it away asks first, and the stand goes back.
      const event = page.locator('li').filter({ hasText: "Doelpunt 88' Verzonnen Aanvaller" })

      await event.locator('summary').click()
      await event.getByRole('button', { name: 'Ja, haal weg' }).click()
      await expect(page.getByRole('heading', { level: 2, name: 'Stand 1–0' })).toBeVisible()

      if (javaScriptEnabled) {
        // The event and its button are gone: the focus is on the heading of the list.
        await expect(page.locator('#gebeurtenissen-kop')).toBeFocused()
        // The screen with its forms, its list and the questions open, which axe opens too.
        expect(await checkPage(page)).toEqual([])
      }
    })
  })
}

for (const [name, javaScriptEnabled] of [
  ['with JavaScript', true],
  ['without JavaScript', false],
] as const) {
  test.describe(`pasting a match report ${name}`, () => {
    test.use({ javaScriptEnabled })

    test(`reads a text into the form, with what was not read, and stores nothing ${name}`, async ({ page }) => {
      const address = `/beheer/wedstrijden/${await playedMatchId()}/verslag`

      await page.goto(address)
      await page.getByRole('link', { name: 'Tekst plakken' }).click()
      await expect(page).toHaveURL(/\/verslag\/plakken$/u)
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Verslag plakken: ')
      await expect(page.getByLabel('Tekst van het verslag', { exact: true })).toBeVisible()
      await expect(page.getByLabel('Voorbeeld', { exact: true })).toHaveValue(/^Formatie: 4-3-3\nOpstelling\n/u)

      // An empty text is asked for again, with the error at the field.
      await page.getByRole('button', { name: 'Tekst lezen' }).click()
      await expect(page.getByText('Plak eerst de tekst van het verslag.').first()).toBeVisible()

      if (javaScriptEnabled) {
        // The list of the error has the focus, so a screen reader says what is wrong.
        await expect(page.locator('#plak-fouten')).toBeFocused()
      }

      // A text with a line that means nothing: the form comes back with the line-up filled in,
      // and the line that could not be read is in the list, with its number.
      await page
        .getByLabel('Tekst van het verslag', { exact: true })
        .fill(
          ['Opstelling', '1 Verzonnen Keeper', '2 Een Verdediger (a)', '3x dit is geen regel van het verslag'].join(
            '\n',
          ),
        )
      await page.getByRole('button', { name: 'Tekst lezen' }).click()
      await expect(page.getByRole('heading', { level: 2, name: 'Gelezen' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 3, name: 'Niet gelezen' })).toBeVisible()
      await expect(page.getByText('Regel 4:', { exact: false })).toBeVisible()
      await expect(page.getByText('Er is nog niets bewaard.', { exact: false })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Gegevens' })).toBeVisible()

      if (javaScriptEnabled) {
        // The result has the focus, and the page with the form passes the checks.
        await expect(page.locator('#plakresultaat')).toBeFocused()
        expect(await checkPage(page)).toEqual([])
      }

      // The form posts on this screen, with and without JavaScript: a row is added, a save with
      // a doubt that is not settled comes back with its errors, and the field for the text is
      // gone.
      await page.locator('button[value="speler-zij-toevoegen"]').click()
      await expect(page.locator('#speler-zij-1-rugnummer')).toHaveCount(1)
      await expect(page.getByLabel('Tekst van het verslag', { exact: true })).toHaveCount(0)
      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page.locator('#fouten')).toBeVisible()
      await expect(page.getByLabel('Tekst van het verslag', { exact: true })).toHaveCount(0)
      await expect(page.getByRole('heading', { level: 2, name: 'Gegevens' })).toBeVisible()

      // Nothing was stored: the report screen still has no report.
      await page.goto(address)
      await expect(page.getByText('Nog geen verslag')).toBeVisible()
    })
  })
}

for (const [name, javaScriptEnabled] of [
  ['with JavaScript', true],
  ['without JavaScript', false],
] as const) {
  test.describe(`the formation of a match report ${name}`, () => {
    test.use({ javaScriptEnabled })

    test(`is chosen, refused when it is wrong, stored and shown again ${name}`, async ({ page }) => {
      const address = `/beheer/wedstrijden/${await playedMatchId()}/verslag`

      await page.goto(address)
      await expect(page.locator('label[for="formatie-wij"]')).toHaveText('Formatie van sc Heerenveen')

      // A formation from the list for our team, and one of his own for the opponent that is
      // wrong.
      await page.locator('#formatie-wij').selectOption('4-3-3')

      // The field of his own is there for Anders only, which the browser has to show (jsdom
      // can't); without JavaScript the page can't change it, so it stays.
      await expect(page.locator('#formatie-wij-eigen'))[javaScriptEnabled ? 'toBeHidden' : 'toBeVisible']()
      await page.locator('#formatie-zij').selectOption('anders')
      await page.locator('#formatie-zij-eigen').fill('4-3-4')
      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page.locator('#formatie-zij-eigen-error')).toContainText('tellen op tot 11')
      await expect(page.locator('#formatie-zij-eigen')).toHaveAttribute('aria-invalid', 'true')
      await expect(page.locator('#formatie-wij')).toHaveValue('4-3-3')

      if (javaScriptEnabled) {
        await expect(page.locator('#fouten')).toBeFocused()
        expect(await checkPage(page)).toEqual([])
      }

      // With a formation that follows the rule the report is stored, and comes back as it was.
      await page.locator('#formatie-zij-eigen').fill('4-1-2-1-2')
      await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
      await expect(page).toHaveURL(/\/verslag\?gedaan=opgeslagen$/u)
      await expect(page.locator('#formatie-wij')).toHaveValue('4-3-3')
      await expect(page.locator('#formatie-zij')).toHaveValue('anders')
      await expect(page.locator('#formatie-zij-eigen')).toHaveValue('4-1-2-1-2')

      // Taking the report away takes the formations with it.
      await page.locator('summary', { hasText: 'Verslag weghalen' }).click()
      await page.getByLabel('Reden om het verslag weg te halen').fill('Het was een test')
      await page.getByRole('button', { name: /^Verslag weghalen voor/u }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Verslag weggehaald.' })).toBeVisible()
      await expect(page.locator('#formatie-wij')).toHaveValue('')
    })
  })
}
