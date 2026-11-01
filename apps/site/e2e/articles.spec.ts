import { expect, test } from '@playwright/test'

import { testArticles } from './articles'

// What the unit tests can't see: the article in a real browser, the card on the homepage, and
// that a draft and an article for later are on no page at all, not even in the sitemap or in
// the HTML of the homepage.

const { draft, later, published } = testArticles
const address = `/redactie/${published.slug}`

test.describe('an article of the editors', () => {
  test('has its title as the one h1, its author and a date in a time element, and its text', async ({ page }) => {
    await page.goto(address)

    await expect(page.getByRole('main').getByRole('article')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(published.title)
    await expect(page.getByText(`Door ${published.author}`)).toBeVisible()
    await expect(page.locator('article time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/)
    await expect(page.locator('article time')).toHaveText(/^\d{1,2} [a-z]+ \d{4}$/)
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Een kop in het artikel', 'Een tweede kop'])
    await expect(page.locator('article strong').first()).toHaveText('verzonnen')
    await expect(page.locator('article em')).toHaveText('cursieve')
    await expect(page.locator('article li')).toHaveCount(2)
  })

  test('shows HTML in the text as text, not as an element', async ({ page }) => {
    await page.goto(address)

    await expect(page.locator('article')).toContainText('<b>HTML</b>')
    await expect(page.locator('article p:not(.hf-intro) b')).toHaveCount(0)
  })

  test('has a link to another site with the icon, and a link to a page of ours without one', async ({ page }) => {
    await page.goto(address)

    const external = page.getByRole('link', { name: 'de Testkrant' })
    const internal = page.getByRole('link', { name: 'onze bronnen' })

    await expect(external).toHaveAttribute('href', 'https://testkrant.test/verhaal')
    await expect(external).toHaveAttribute('rel', 'noopener')
    await expect(external.locator('svg')).toHaveCount(1)
    await expect(internal).toHaveAttribute('href', '/bronnen')
    await expect(internal.locator('svg')).toHaveCount(0)
  })

  test('has a title, a description from the intro and a canonical address for search engines', async ({ page }) => {
    await page.goto(address)

    await expect(page).toHaveTitle(`${published.title} – sc Heerenveen Fansite`)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', published.intro)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${address}$`))
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  })

  test('is in the sitemap, and the draft and the article for later are not', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()

    expect(xml).toContain(`${address}</loc>`)
    expect(xml).not.toContain(draft.slug)
    expect(xml).not.toContain(later.slug)
  })
})

test.describe('the card on the homepage', () => {
  test('is above the news and has the newest published article, with a link to its page', async ({ page }) => {
    await page.goto('/')

    const card = page.getByRole('region', { name: 'Van de redactie' })

    await expect(card).toBeVisible()
    await expect(card.getByRole('heading', { level: 3 })).toHaveText(published.title)
    await expect(card).toContainText(published.intro)
    await expect(card.locator('time')).toHaveCount(1)
    await expect(card.getByRole('link', { name: `Lees verder over ${published.title}` })).toHaveAttribute(
      'href',
      address,
    )

    const cardBox = await card.boundingBox()
    const newsBox = await page.getByRole('region', { name: 'Laatste nieuws' }).boundingBox()

    expect(cardBox?.y).toBeLessThan(newsBox?.y ?? 0)
  })

  test('opens the page of the article', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { level: 3 }).getByRole('link', { name: published.title }).click()

    await expect(page).toHaveURL(new RegExp(`${address}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(published.title)
  })
})

test.describe('the card on the news page', () => {
  test('is in the short form in the sidebar, under the filter and above the podcasts', async ({ page }) => {
    await page.goto('/nieuws')

    const card = page.getByRole('region', { name: 'Van de redactie' })
    const sidebar = page.getByRole('complementary')

    await expect(sidebar.getByRole('region', { name: 'Van de redactie' })).toBeVisible()
    await expect(card.getByRole('link', { name: published.title })).toHaveAttribute('href', address)
    await expect(card).toContainText(published.intro)
    await expect(card.getByRole('link', { name: /Lees verder/ })).toHaveCount(0)

    const filterBox = await sidebar.getByRole('group', { name: 'Bronnen' }).boundingBox()
    const cardBox = await card.boundingBox()
    const podcastsBox = await sidebar.getByRole('region', { name: 'Podcasts' }).boundingBox()

    expect(filterBox?.y).toBeLessThan(cardBox?.y ?? 0)
    expect(cardBox?.y).toBeLessThan(podcastsBox?.y ?? 0)
  })
})

test.describe('a draft and an article for later', () => {
  for (const { slug, title } of [draft, later]) {
    test(`${slug} says "niet gevonden", like an address that is no article, and shows nothing of itself`, async ({
      page,
    }) => {
      const response = await page.goto(`/redactie/${slug}`)
      const unknown = await page.goto('/redactie/bestaat-niet')

      expect(response?.status()).toBe(404)
      expect(unknown?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pagina niet gevonden')
      await page.goto(`/redactie/${slug}`)
      await expect(page.locator('body')).not.toContainText(title)
    })

    test(`${slug} is not on the homepage or the news page`, async ({ page }) => {
      for (const path of ['/', '/nieuws']) {
        await page.goto(path)

        const html = await page.content()

        expect(html).not.toContain(title)
        expect(html).not.toContain(slug)
      }
    })
  }
})
