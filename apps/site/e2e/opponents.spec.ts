import { expect, type Page, test } from '@playwright/test'

// The page Tegenstanders and the page of a club, on the made-up matches of the checks: Testdorp
// FC is met in the league, FC Maquette in the cup only.

const columns = ['Gespeeld', 'Gewonnen', 'Gelijk', 'Verloren'] as const

/** The first four figures of the row of a club in the list: played, won, drawn and lost. */
async function listRow(page: Page, club: string) {
  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: club }) })
  const cells = await row.getByRole('cell').allInnerTexts()

  return cells.slice(0, 4).map(Number)
}

/** The Totaal column of the summary of a club: played, won, drawn and lost. */
async function totals(page: Page) {
  const table = page.getByRole('table', { name: /^De uitslagen van sc Heerenveen tegen/ })
  const figures: number[] = []

  for (const name of columns) {
    const row = table.getByRole('row').filter({ has: page.getByRole('rowheader', { exact: true, name }) })

    figures.push(Number(await row.getByRole('cell').first().innerText()))
  }

  return figures
}

for (const choice of ['', '?competitie=eredivisie']) {
  test(`the figures of a club in the list are the Totaal of its page${choice === '' ? '' : ', for the Eredivisie'}`, async ({
    page,
  }) => {
    await page.goto(`/statistieken/tegenstanders${choice}`)

    const inList = await listRow(page, 'Testdorp FC')

    await page.getByRole('link', { name: 'Testdorp FC' }).click()

    await expect(page).toHaveURL(new RegExp(`/statistieken/tegenstanders/testdorp-fc${choice.replace('?', '\\?')}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Testdorp FC')
    expect(await totals(page)).toEqual(inList)
    expect(inList[0]).toBeGreaterThan(0)
    expect((inList[1] ?? 0) + (inList[2] ?? 0) + (inList[3] ?? 0)).toBe(inList[0])
  })
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the switch of the list is two links, and a club we only met in the cup leaves the list', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders')

    const choices = page.getByRole('group', { name: 'Welke wedstrijden' })

    await expect(page.getByRole('rowheader', { name: 'FC Maquette' })).toBeVisible()
    await choices.getByRole('link', { name: 'Eredivisie' }).click()

    await expect(page).toHaveURL(/\/statistieken\/tegenstanders\?competitie=eredivisie$/)
    await expect(page.getByRole('rowheader', { name: 'FC Maquette' })).toHaveCount(0)
    await expect(page.getByRole('rowheader', { name: 'Testdorp FC' })).toBeVisible()
  })

  test('the page of a club we only met in the cup says so with the choice Eredivisie', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders/fc-maquette?competitie=eredivisie')

    await expect(page.getByText('In de Eredivisie hebben we nog niet tegen deze club gespeeld.')).toBeVisible()
    await page.getByRole('link', { name: 'Alle wedstrijden' }).click()

    await expect(page).toHaveURL(/\/statistieken\/tegenstanders\/fc-maquette$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Onze uitslagen tegen FC Maquette' })).toBeVisible()
  })
})

test.describe('the bar of Statistieken', () => {
  test('marks Tegenstanders on the list and on the page of a club, and leads from Spelers to it', async ({ page }) => {
    const bar = page.getByRole('navigation', { name: 'Hoofdmenu' })

    await page.goto('/statistieken/spelers')
    await bar.getByRole('link', { name: 'Tegenstanders' }).click()

    await expect(page).toHaveURL(/\/statistieken\/tegenstanders$/)
    await expect(bar.getByRole('link', { name: 'Tegenstanders' })).toHaveAttribute('aria-current', 'page')
    await expect(bar.getByRole('link', { name: 'Spelers' })).not.toHaveAttribute('aria-current', 'page')

    await page.getByRole('link', { name: 'Testdorp FC' }).click()

    await expect(bar.getByRole('link', { name: 'Tegenstanders' })).toHaveAttribute('aria-current', 'page')
  })
})
