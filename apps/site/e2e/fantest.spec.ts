import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'

// A visitor plays a month of the Fantest from the archive (#1480). No account, no cookie and
// nothing stored: the page checks the answers and forgets them. The made-up quiz of June 2003
// has ten questions and the figures of 38 visitors, the one of September 2003 a question left
// out and too few visitors for the figures (see fantest.ts).

const question = (page: Page, number: number) => page.getByRole('group', { name: `Testvraag ${number} over Testclub?` })

// The radio button covers its whole row and is invisible to the eye, so the check goes to it.
const choose = (page: Page, number: number, answer: string) =>
  question(page, number).getByRole('radio', { name: answer }).check()

for (const javaScriptEnabled of [false, true]) {
  test.describe(javaScriptEnabled ? 'with JavaScript' : 'without JavaScript', () => {
    test.use({ javaScriptEnabled })

    test('refuses an unanswered question with its own error, keeps the rest, and then checks the quiz', async ({
      context,
      page,
    }) => {
      await page.goto('/fans/fantest/2003-06')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fantest juni 2003')
      await expect(page.getByText('Vraag 1 van 10')).toBeVisible()

      // Nine answers and a gap: question 5 stays empty. Question 1 right, the others wrong.
      for (let number = 1; number <= 10; number += 1) {
        if (number !== 5) {
          await choose(page, number, number === 1 ? 'Testantwoord B' : 'Testantwoord A')
        }
      }
      await page.getByRole('button', { name: 'Kijk mijn antwoorden na' }).click()
      await expect(page.getByRole('heading', { name: 'Nog 1 vraag zonder antwoord' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Kies een antwoord bij vraag 5.' })).toHaveAttribute(
        'href',
        '#vraag-5',
      )
      await expect(question(page, 5).getByText('Kies een antwoord bij vraag 5.')).toBeVisible()
      await expect(question(page, 1).getByRole('radio', { name: 'Testantwoord B' })).toBeChecked()
      // axe needs JavaScript in the page; the pages are checked with it in pages.spec.ts too.
      if (javaScriptEnabled) {
        expect(await checkPage(page)).toEqual([])
      }

      // Now all ten. Question 1 has the right answer 2 (position 1 gives place 2), question 2
      // gives place 3, and so on: the made-up right answer is (position % 4) + 1.
      await choose(page, 5, 'Testantwoord A')
      await page.getByRole('button', { name: 'Kijk mijn antwoorden na' }).click()
      await expect(page.getByRole('heading', { level: 2, name: 'Je score' })).toBeVisible()
      await expect(page.getByText('Bij elke vraag: hoe fans het toen deden.')).toBeVisible()
      await expect(page.getByText('38')).toBeVisible()
      await expect(page.getByText('Goed.').first()).toBeVisible()
      await expect(page.getByText(/Fout\. Het goede antwoord is/).first()).toBeVisible()
      await expect(page.getByText('60%').first()).toBeVisible()
      // axe needs JavaScript in the page; the pages are checked with it in pages.spec.ts too.
      if (javaScriptEnabled) {
        expect(await checkPage(page)).toEqual([])
      }

      // Nothing is kept: no cookie, and the link "Opnieuw" gives the empty quiz again.
      expect(await context.cookies()).toEqual([])
      await page.getByRole('link', { name: 'Opnieuw' }).click()
      await expect(page).toHaveURL(/\/fans\/fantest\/2003-06$/)
      await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    })
  })
}

test('says so, scores "van 9" and shows no figures, for a month with a question left out and few visitors', async ({
  page,
}) => {
  await page.goto('/fans/fantest/2003-09')
  await expect(page.getByText('Bij deze maand ontbreekt een vraag')).toBeVisible()
  await expect(page.getByText('Vraag 9 van 9')).toBeVisible()
  expect(await checkPage(page)).toEqual([])

  for (const number of [1, 2, 3, 5, 6, 7, 8, 9, 10]) {
    await choose(page, number, 'Testantwoord A')
  }
  await page.getByRole('button', { name: 'Kijk mijn antwoorden na' }).click()
  await expect(page.getByText(/van 9/).first()).toBeVisible()
  await expect(page.getByText('%')).toHaveCount(0)
  await expect(page.getByText('gemiddeld')).toHaveCount(0)
})

test('lists the months by year with a link to each, and leaves out a month without a quiz', async ({ page }) => {
  await page.goto('/fans/fantest')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fantest')
  await expect(
    page.getByText('Vragen uit het archief van de Fansite, gemaakt door de toenmalige redactie.'),
  ).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: '2003' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Juni 2003' })).toHaveAttribute('href', '/fans/fantest/2003-06')
  await expect(page.getByRole('link', { name: 'Juli 2003' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Fantest' })).toBeVisible()
})

test('shows a closed month of the editors to everybody, who can then play it without a trace', async ({
  context,
  page,
}) => {
  await page.goto('/fans/fantest/2025-03')
  await expect(page.getByRole('heading', { level: 2, name: 'Zo deed iedereen het' })).toBeVisible()
  await expect(page.getByText('Het goede antwoord is Testantwoord B.').first()).toBeVisible()
  await expect(page.getByText('Een verzonnen slottekst.')).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(0)

  await page.getByRole('link', { name: 'Speel deze quiz zelf' }).click()
  // Question n has the right answer ((n - 1) % 4) + 1: all ten right.
  for (let number = 1; number <= 10; number += 1) {
    await page
      .getByRole('group', { name: `Redactievraag ${number} over Testclub?` })
      .getByRole('radio', { name: `Testantwoord ${'ABCD'[(number - 1) % 4]}` })
      .check()
  }
  await page.getByRole('button', { name: 'Kijk mijn antwoorden na' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Je score' })).toBeVisible()
  await expect(page.getByText('jouw score')).toBeVisible()
  await expect(page.getByText('Goed.')).toHaveCount(10)
  expect(await checkPage(page)).toEqual([])
  expect(await context.cookies()).toEqual([])
})
