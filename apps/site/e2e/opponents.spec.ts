import { expect, type Page, test } from '@playwright/test'

// The page Tegenstanders and the page of a club, on the made-up matches of the checks: Testdorp
// FC is met in the league, FC Maquette in the cup only, and Voorbeeld United is visited twice
// in the league in a stadium with two names. Nepstad Rangers, Demo Boys and SV Proefdorp have
// a match still to come and none played.

/** The first four figures of the row of a club in the list: played, won, drawn and lost. */
async function listRow(page: Page, club: string) {
  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: club }) })
  const cells = await row.getByRole('cell').allInnerTexts()

  return cells.slice(0, 4).map(Number)
}

/** The Totaal row of the summary of a club: played, won, drawn and lost. */
async function totals(page: Page) {
  const table = page.getByRole('table', { name: /^De uitslagen van sc Heerenveen tegen/ })
  const row = table.getByRole('row').filter({ has: page.getByRole('rowheader', { exact: true, name: 'Totaal' }) })

  return (await row.getByRole('cell').allInnerTexts()).slice(0, 4).map(Number)
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

/** One column of the list from the top: 1 is G gespeeld, 5 is P punten, 6 is D doelsaldo. */
const columnFigures = async (page: Page, column: number) =>
  (await page.locator(`tbody td:nth-of-type(${column})`).allInnerTexts()).map((text) =>
    Number.parseInt(text.replace('\u2212', '-'), 10),
  )

test.describe('sorting the list', () => {
  test('sorts with the keyboard, keeps the focus on the button and says what happened', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders')

    const played = page.getByRole('button', { exact: true, name: 'G gespeeld' })
    const status = page.getByRole('status')
    const given = await clubNames(page)

    await expect(page.getByRole('columnheader', { exact: true, name: 'G gespeeld' })).toHaveAttribute(
      'aria-sort',
      'none',
    )
    await expect(page.getByRole('columnheader', { exact: true, name: 'D doelsaldo' })).toHaveAttribute(
      'aria-sort',
      'none',
    )
    await played.focus()
    await page.keyboard.press('Enter')

    await expect(played).toBeFocused()
    await expect(page.getByRole('columnheader', { exact: true, name: 'G gespeeld' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    await expect(page.getByRole('columnheader', { exact: true, name: 'D doelsaldo' })).toHaveAttribute(
      'aria-sort',
      'none',
    )
    await expect(status).toHaveText('Gesorteerd op Gespeeld, van hoog naar laag')

    const down = await columnFigures(page, 1)

    expect(down).toEqual([...down].toSorted((a, b) => b - a))
    expect([...(await clubNames(page))].toSorted()).toEqual([...given].toSorted())

    await page.keyboard.press('Space')

    await expect(played).toBeFocused()
    await expect(page.getByRole('columnheader', { exact: true, name: 'G gespeeld' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    await expect(status).toHaveText('Gesorteerd op Gespeeld, van laag naar hoog')
    const up = await columnFigures(page, 1)

    expect(up).toEqual([...up].toSorted((a, b) => a - b))
  })

  test('sorts the clubs from A to Z on the first click on Club, then from Z to A', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders')
    await page.getByRole('button', { exact: true, name: 'G gespeeld' }).click()
    await page.getByRole('button', { exact: true, name: 'Club' }).click()

    const collator = new Intl.Collator('nl', { sensitivity: 'base' })
    const names = await clubNames(page)

    expect(names).toEqual([...names].toSorted(collator.compare))
    await expect(page.getByRole('status')).toHaveText('Gesorteerd op Club, van A tot Z')

    await page.getByRole('button', { exact: true, name: 'Club' }).click()

    expect(await clubNames(page)).toEqual(names.toReversed())
  })

  for (const choice of ['', '?competitie=eredivisie']) {
    test(`has the columns Punten and Doelsaldo${choice === '' ? '' : ' with the Eredivisie'}, and sorts on them`, async ({
      page,
    }) => {
      await page.goto(`/statistieken/tegenstanders${choice}`)

      await expect(page.getByRole('columnheader', { exact: true, name: 'P punten' })).toHaveAttribute(
        'aria-sort',
        'none',
      )
      await expect(page.getByRole('columnheader', { exact: true, name: 'D doelsaldo' })).toHaveAttribute(
        'aria-sort',
        'none',
      )
      await expect(page.locator('thead th')).toHaveCount(7)

      await page.getByRole('button', { exact: true, name: 'P punten' }).click()

      const points = await columnFigures(page, 5)

      expect(points.length).toBeGreaterThan(0)
      expect(points).toEqual([...points].toSorted((a, b) => b - a))
      await expect(page.getByRole('status')).toHaveText('Gesorteerd op Punten, van hoog naar laag')

      await page.getByRole('button', { exact: true, name: 'D doelsaldo' }).click()

      const differences = await columnFigures(page, 6)

      expect(differences.length).toBeGreaterThan(0)
      expect(differences).toEqual([...differences].toSorted((a, b) => b - a))
      await expect(page.getByRole('columnheader', { exact: true, name: 'D doelsaldo' })).toHaveAttribute(
        'aria-sort',
        'descending',
      )
      await expect(page.getByRole('status')).toHaveText('Gesorteerd op Doelsaldo, van hoog naar laag')
      expect(await page.locator('tbody td:nth-of-type(6)').first().innerText()).toMatch(/^([+−]\d+|0)$/)
    })
  }

  test('fits a phone of 320 pixels, with the arrow and every column', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 320 })
    await page.goto('/statistieken/tegenstanders?competitie=eredivisie')
    await page.getByRole('button', { exact: true, name: 'D doelsaldo' }).click()

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true)
    for (const name of ['Club', 'G gespeeld', 'W winst', 'G gelijk', 'V verlies', 'D doelsaldo', 'P punten']) {
      const box = await page.getByRole('button', { exact: true, name }).boundingBox()

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
    await expect(page.getByRole('columnheader', { exact: true, name: 'gespeeld' })).toBeVisible()

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

test.describe('the page of a club', () => {
  test('has the matches in the main column and the results and the stadiums in the sidebar', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders/voorbeeld-united')

    await expect(page.getByRole('main').getByRole('heading', { level: 2, name: 'Wedstrijden' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 2, name: /^Onze uitslagen/ })).toHaveCount(0)

    const sidebar = page.getByRole('complementary', { name: 'Onze uitslagen, het stadion en de bron' })

    await expect(sidebar.getByRole('heading', { level: 2 })).toHaveText([
      'Onze uitslagen tegen Voorbeeld United',
      'Stadions',
    ])
    await expect(sidebar.getByText(/^Bron: /)).toBeVisible()
  })

  test('names the stadium of a club that changed it, in the order we saw them', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders/voorbeeld-united')

    // The checks also seed the season of a year ago, so the made-up names come twice: the old
    // name, the new one, and then both again. A name that returns is a line of its own.
    const items = page.getByRole('region', { name: 'Stadions' }).locator('li')

    await expect(items).toHaveCount(4)
    await expect(items.nth(0)).toContainText(/^tot .*Oud Voorbeeldpark$/)
    await expect(items.nth(1)).toContainText(/^tot .*Voorbeeldpark$/)
    await expect(items.nth(2)).toContainText(/^tot .*Oud Voorbeeldpark$/)
    await expect(items.nth(3)).toContainText(/^vanaf .*Voorbeeldpark$/)
    await expect(
      page.getByRole('region', { name: 'Stadions' }).getByRole('link', { name: 'Stadions' }),
    ).toHaveAttribute('href', '#stadion')
  })

  test('has the row Laatste wedstrijden for a club with five matches, and none for one with fewer', async ({
    page,
  }) => {
    await page.goto('/statistieken/tegenstanders/testdorp-fc')

    // The matches of this and the last season are 6–0 each, and the older ones are a draw, a
    // loss and a win (see older-meetings.ts): the oldest first and the newest last.
    await expect(page.locator('.hf-mark-row .hf-visually-hidden')).toHaveText(
      'Laatste wedstrijden: winst, verlies, gelijk, winst, winst',
    )

    for (const club of ['voorbeeld-united', 'fc-maquette']) {
      await page.goto(`/statistieken/tegenstanders/${club}`)

      await expect(page.getByRole('heading', { level: 2, name: 'Wedstrijden' })).toBeVisible()
      await expect(page.locator('.hf-mark-row')).toHaveCount(0)
    }
  })

  test('has no card Stadion for a club whose only league match was at home, and none for the cup', async ({ page }) => {
    for (const club of ['testdorp-fc', 'fc-maquette']) {
      await page.goto(`/statistieken/tegenstanders/${club}`)

      await expect(page.getByRole('heading', { level: 2, name: /^Onze uitslagen/ })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: /^Stadions?$/ })).toHaveCount(0)
    }
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

test.describe('the matches to come on the page of a club', () => {
  test('has them under Komende wedstrijden, and the sentence under Gespeelde wedstrijden for a club not played yet', async ({
    page,
  }) => {
    await page.goto('/statistieken/tegenstanders/nepstad-rangers')

    const card = page.getByRole('region', { name: 'Wedstrijden' })

    await expect(card.getByRole('heading', { level: 3 })).toHaveText(['Komende wedstrijden', 'Gespeelde wedstrijden'])
    await expect(card.getByRole('list').first().getByRole('listitem')).toHaveCount(1)
    await expect(card.getByRole('listitem').first()).toContainText('Nepstad Rangers')
    await expect(card.getByRole('listitem').first()).toContainText('Eredivisie · Speelronde 4')
    await expect(card.getByText('We hebben nog niet tegen deze club gespeeld.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /^Onze uitslagen/ })).toHaveCount(0)
    // Without a played match there is no summary, but the credit is still there.
    await expect(page.getByRole('complementary', { name: 'De bron' }).getByText(/^Bron: /)).toBeVisible()
  })

  test('shows a match that is called off with "Uitgesteld"', async ({ page }) => {
    await page.goto('/statistieken/tegenstanders/demo-boys')

    await expect(page.getByRole('region', { name: 'Wedstrijden' }).getByText('Uitgesteld')).toBeVisible()
  })

  test('leaves out a cup tie with the choice Eredivisie, and brings it back with Alle wedstrijden', async ({
    page,
  }) => {
    await page.goto('/statistieken/tegenstanders/sv-proefdorp?competitie=eredivisie')

    const card = page.getByRole('region', { name: 'Wedstrijden' })

    await expect(page.getByText('In de Eredivisie hebben we nog niet tegen deze club gespeeld.')).toBeVisible()
    await expect(card.getByText('KNVB Beker')).toHaveCount(0)
    await page.getByRole('link', { name: 'Alle wedstrijden' }).click()

    await expect(page).toHaveURL(/\/statistieken\/tegenstanders\/sv-proefdorp$/)
    await expect(card.getByText('KNVB Beker · Tweede ronde')).toBeVisible()
  })
})
