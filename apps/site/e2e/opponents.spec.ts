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

/** The names of the clubs in the list, from the top. */
const clubNames = (page: Page) => page.locator('tbody th').allInnerTexts()

/** The figures of one column of the list, from the top: 1 is Gespeeld, 5 is Doelpunten. */
const columnFigures = async (page: Page, column: number) =>
  (await page.locator(`tbody td:nth-of-type(${column})`).allInnerTexts()).map((text) => Number.parseInt(text, 10))

test.describe('sorting the list', () => {
  test('sorts with the keyboard, keeps the focus on the button and says what happened', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders')

    const played = page.getByRole('button', { name: 'gespeeld' })
    const status = page.getByRole('status')
    const given = await clubNames(page)

    await expect(page.getByRole('columnheader', { name: 'gespeeld' })).toHaveAttribute('aria-sort', 'none')
    await expect(page.getByRole('columnheader', { name: 'doelpunten' })).toHaveAttribute('aria-sort', 'none')
    await played.focus()
    await page.keyboard.press('Enter')

    await expect(played).toBeFocused()
    await expect(page.getByRole('columnheader', { name: 'gespeeld' })).toHaveAttribute('aria-sort', 'descending')
    await expect(page.getByRole('columnheader', { name: 'doelpunten' })).toHaveAttribute('aria-sort', 'none')
    await expect(status).toHaveText('Gesorteerd op Gespeeld, van hoog naar laag')

    const down = await columnFigures(page, 1)

    expect(down).toEqual([...down].toSorted((a, b) => b - a))
    expect([...(await clubNames(page))].toSorted()).toEqual([...given].toSorted())

    await page.keyboard.press('Space')

    await expect(played).toBeFocused()
    await expect(page.getByRole('columnheader', { name: 'gespeeld' })).toHaveAttribute('aria-sort', 'ascending')
    await expect(status).toHaveText('Gesorteerd op Gespeeld, van laag naar hoog')
    const up = await columnFigures(page, 1)

    expect(up).toEqual([...up].toSorted((a, b) => a - b))
  })

  test('sorts the clubs from A to Z on the first click on Club, then from Z to A', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders')
    await page.getByRole('button', { name: 'gespeeld' }).click()
    await page.getByRole('button', { name: 'Club' }).click()

    const collator = new Intl.Collator('nl', { sensitivity: 'base' })
    const names = await clubNames(page)

    expect(names).toEqual([...names].toSorted(collator.compare))
    await expect(page.getByRole('status')).toHaveText('Gesorteerd op Club, van A tot Z')

    await page.getByRole('button', { name: 'Club' }).click()

    expect(await clubNames(page)).toEqual(names.toReversed())
  })

  test('has the column Punten only with the Eredivisie, and sorts on it', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders')

    await expect(page.getByRole('columnheader', { name: 'punten' })).toHaveCount(0)

    await page.goto('/statistieken/tegenstanders?competitie=eredivisie')
    await expect(page.getByRole('columnheader', { name: 'punten' })).toHaveAttribute('aria-sort', 'none')
    await page.getByRole('button', { name: 'punten' }).click()

    const points = await columnFigures(page, 6)

    expect(points.length).toBeGreaterThan(0)
    expect(points).toEqual([...points].toSorted((a, b) => b - a))
    await expect(page.getByRole('status')).toHaveText('Gesorteerd op Punten, van hoog naar laag')
  })

  test('fits a phone of 320 pixels, with the arrow and every column', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 320 })
    await page.goto('/statistieken/tegenstanders?competitie=eredivisie')
    await page.getByRole('button', { name: 'doelpunten' }).click()

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true)
    for (const name of ['Club', 'gespeeld', 'gewonnen', 'gelijk', 'verloren', 'doelpunten', 'punten']) {
      const box = await page.getByRole('button', { name }).boundingBox()

      expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
    }
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the headers are plain text and the list stays A to Z', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders')

    await expect(page.getByRole('button')).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: 'gespeeld' })).toBeVisible()

    const names = await clubNames(page)

    expect(names.length).toBeGreaterThan(1)
    expect(names).toEqual([...names].toSorted(new Intl.Collator('nl', { sensitivity: 'base' }).compare))
  })

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
