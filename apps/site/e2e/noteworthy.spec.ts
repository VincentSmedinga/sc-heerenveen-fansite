import { expect, test } from '@playwright/test'

import { earlierSeasonSlug } from './earlier-season'

const slug = earlierSeasonSlug()
const path = `/statistieken/${slug}`

// The card Opmerkelijk on Statistieken is one fact from the made-up matches. The checks put the
// seed in the season before the current one, and it has exactly one fact: two goals in the
// 66th and 67th minute of the second round. With one fact the card has no link to a next one,
// and a number in the address that is too high goes round to the same card. The unit tests have
// the order and the links; this checks the page the visitor gets.
const fact = /vielen in de 66e en de 67e minuut twee doelpunten achter elkaar\.$/

test.describe('the card Opmerkelijk without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('is a region with a heading and one sentence, after Thuis en uit', async ({ page }) => {
    await page.goto(path)

    const card = page.getByRole('region', { name: 'Opmerkelijk' })

    await expect(card.getByRole('heading', { level: 2, name: 'Opmerkelijk' })).toBeVisible()
    await expect(card.getByText(fact)).toBeVisible()
    await expect(card.getByRole('link')).toHaveCount(0)

    const [home, facts] = await Promise.all([
      page.getByRole('region', { name: 'Thuis en uit' }).boundingBox(),
      card.boundingBox(),
    ])

    expect(facts?.y).toBeGreaterThan(home?.y ?? Infinity)
  })

  test('says the match with its score and the day with the year', async ({ page }) => {
    await page.goto(`${path}?competitie=eredivisie`)

    await expect(
      page
        .getByRole('region', { name: 'Opmerkelijk' })
        .getByText(/^(Thuis tegen|Uit bij) .+ \(\d–\d, \d+ \p{L}+ \d{4}\) /u),
    ).toBeVisible()
  })

  test('shows the same fact for a number past the last one, and for one that is not valid', async ({ page }) => {
    for (const query of ['?opmerkelijk=7', '?opmerkelijk=abc', '?opmerkelijk=0']) {
      await page.goto(`${path}${query}`)

      await expect(page.getByRole('region', { name: 'Opmerkelijk' }).getByText(fact)).toBeVisible()
    }
  })
})
