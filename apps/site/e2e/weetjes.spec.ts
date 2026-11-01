import { expect, test } from '@playwright/test'

import { earlierSeasonSlug } from './earlier-season'

const slug = earlierSeasonSlug()

// The card Weetjes on Statistieken is one fact from the made-up matches. The seed has exactly
// one: two goals in the 66th and 67th minute of the second round. With one weetje the card has
// no link to a next one, and a number in the address that is too high goes round to the same
// card. The unit tests have the order and the links; this checks the page the visitor gets.
const weetje = /vielen in de 66e en de 67e minuut twee doelpunten achter elkaar\.$/

test.describe('the card Weetjes without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('is a region with a heading and one sentence, after Thuis en uit', async ({ page }) => {
    await page.goto('/statistieken')

    const card = page.getByRole('region', { name: 'Weetjes' })

    await expect(card.getByRole('heading', { level: 2, name: 'Weetjes' })).toBeVisible()
    await expect(card.getByText(weetje)).toBeVisible()
    await expect(card.getByRole('link')).toHaveCount(0)

    const [home, weetjes] = await Promise.all([
      page.getByRole('region', { name: 'Thuis en uit' }).boundingBox(),
      card.boundingBox(),
    ])

    expect(weetjes?.y).toBeGreaterThan(home?.y ?? Infinity)
  })

  test('shows the same weetje for a number past the last one, and for one that is not valid', async ({ page }) => {
    for (const query of ['?weetje=7', '?weetje=abc', '?weetje=0']) {
      await page.goto(`/statistieken${query}`)

      await expect(page.getByRole('region', { name: 'Weetjes' }).getByText(weetje)).toBeVisible()
    }
  })

  test('is on the page of an earlier season, with the day it was played', async ({ page }) => {
    await page.goto(`/statistieken/${slug}?competitie=eredivisie`)

    await expect(page.getByRole('region', { name: 'Weetjes' }).getByText(weetje)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Weetjes' }).getByText(/\(\d–\d, \d+ \p{L}+ \d{4}\)/u)).toBeVisible()
  })
})
