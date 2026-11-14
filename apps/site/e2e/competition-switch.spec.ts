import { expect, test } from '@playwright/test'

import { earlierSeasonSlug } from './earlier-season'

const slug = earlierSeasonSlug()

// The switch of the matches (all, the Eredivisie, the cup and Europe) on /wedstrijden/cijfers
// and /spelers is a row of links, so it works without JavaScript, and the choice stays in the
// address when the season is picked. The seed has played cup ties in the current season.
const switchPages = [
  { heading: 'Cijfers', path: '/wedstrijden/cijfers' },
  { heading: 'Spelers', path: '/spelers' },
] as const

for (const { heading, path } of switchPages) {
  test.describe(`the switch of the matches on ${path} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false })

    test('is reached with the keyboard, every choice, and the link changes the page', async ({ page }) => {
      await page.goto(path)

      const choices = page.getByRole('group', { name: 'Welke wedstrijden' })

      await expect(choices.getByRole('link', { name: 'Alles' })).toHaveAttribute('aria-current', 'page')
      await choices.getByRole('link', { name: 'Alles' }).focus()
      await page.keyboard.press('Tab')
      await expect(choices.getByRole('link', { name: 'Eredivisie' })).toBeFocused()
      await page.keyboard.press('Enter')

      await expect(page).toHaveURL(new RegExp(`${path}\\?competitie=eredivisie$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
      await expect(choices.getByRole('link', { name: 'Eredivisie' })).toHaveAttribute('aria-current', 'page')
    })

    test('keeps the choice when the season is picked with the button Toon', async ({ page }) => {
      await page.goto(`${path}?competitie=eredivisie`)

      const picker = page.getByRole('form', { name: 'Seizoen kiezen' })

      await picker.getByRole('combobox', { exact: true, name: 'Seizoen' }).selectOption(slug)
      await picker.getByRole('button', { name: 'Toon' }).click()

      await expect(page).toHaveURL(new RegExp(`${path}/${slug}\\?competitie=eredivisie$`))
    })
  })
}

test.describe('the switch of the matches on a phone', () => {
  test.use({ viewport: { height: 844, width: 390 } })

  test('has its choices on one line within the width, each at least 44 pixels high', async ({ page }) => {
    await page.goto('/wedstrijden/cijfers')

    const links = page.getByRole('group', { name: 'Welke wedstrijden' }).getByRole('link')
    const boxes = await links.evaluateAll((elements) =>
      elements.map((element) => {
        const { bottom, height, left, right, top } = element.getBoundingClientRect()

        return { bottom, height, left, right, top }
      }),
    )

    expect(boxes.length).toBeGreaterThanOrEqual(3)

    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.top).toBeCloseTo(boxes[0]!.top, 0)
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(390)
    }
  })
})
