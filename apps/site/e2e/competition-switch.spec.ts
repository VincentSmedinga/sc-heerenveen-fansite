import { expect, test } from '@playwright/test'

import { earlierSeasonSlug } from './earlier-season'

const slug = earlierSeasonSlug()

// The switch between all the matches and the Eredivisie on /cijfers and
// /spelers/cijfers is two links, so it works without JavaScript, and the choice stays in
// the address when the season is picked. The seed has played cup ties in the current season.
const switchPages = [
  { heading: 'Cijfers', path: '/cijfers' },
  { heading: 'Cijfers van de spelers', path: '/spelers/cijfers' },
] as const

for (const { heading, path } of switchPages) {
  test.describe(`the switch of the matches on ${path} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false })

    test('is reached with the keyboard, both choices, and the link changes the page', async ({ page }) => {
      await page.goto(path)

      const choices = page.getByRole('group', { name: 'Welke wedstrijden' })

      await expect(choices.getByRole('link', { name: 'Alle wedstrijden' })).toHaveAttribute('aria-current', 'page')
      await choices.getByRole('link', { name: 'Alle wedstrijden' }).focus()
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
