import { expect, type Page, test } from '@playwright/test'

// The page Tegenstanders and the page of a club, on the made-up matches of the checks: Testdorp
// FC is met in the league, FC Maquette in the cup only, and Voorbeeld United is visited twice
// in the league in a stadium with two names. Nepstad Rangers, Demo Boys and SV Proefdorp have
// a match still to come and none played.

/** The card Alle tegenstanders; the sidebar has a table of its own, which these tests skip. */
const list = (page: Page) => page.getByRole('region', { name: 'Alle tegenstanders' })

/** The first four figures of the row of a club in the list: played, won, drawn and lost. */
async function listRow(page: Page, club: string) {
  const row = list(page)
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: club }) })
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
    await page.goto(`/tegenstanders${choice}`)

    const inList = await listRow(page, 'Testdorp FC')

    await list(page).getByRole('link', { name: 'Testdorp FC' }).click()

    await expect(page).toHaveURL(new RegExp(`/tegenstanders/testdorp-fc${choice.replace('?', '\\?')}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Testdorp FC')
    expect(await totals(page)).toEqual(inList)
    expect(inList[0]).toBeGreaterThan(0)
    expect((inList[1] ?? 0) + (inList[2] ?? 0) + (inList[3] ?? 0)).toBe(inList[0])
  })
}

/** The card "De plek van <club> en de onze" of Testdorp FC, with its places per season. */
const placesCard = (page: Page, club = 'Testdorp FC') =>
  page.getByRole('region', { name: `De plek van ${club} en de onze` })

for (const choice of ['', '?competitie=eredivisie']) {
  test(`the page of a club has the places of the club and ours per season${choice === '' ? '' : ', the same for the Eredivisie'}`, async ({
    page,
  }) => {
    await page.goto(`/tegenstanders/testdorp-fc${choice}`)

    const card = placesCard(page)
    const table = card.getByRole('table', {
      name: 'De plek in de Eredivisie waarin Testdorp FC en sc Heerenveen eindigden, per seizoen',
    })

    await expect(card.getByRole('heading', { level: 2 })).toHaveText('De plek van Testdorp FC en de onze')
    await expect(table.getByRole('columnheader')).toHaveText(['Seizoen', 'Onze plek', 'Hun plek'])
    expect(await table.getByRole('rowheader').count()).toBeGreaterThanOrEqual(2)
    await expect(card.getByText('Alleen de Eredivisie')).toBeVisible()
  })
}

test('a club that was never in the table with us has no card with the places', async ({ page }) => {
  // FC Maquette was only met in the cup, so it is in no table.
  await page.goto('/tegenstanders/fc-maquette')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('FC Maquette')
  await expect(page.getByRole('heading', { level: 2, name: /^De plek van/ })).toHaveCount(0)
})

/** The names of the clubs in the list, from the top. */
const clubNames = (page: Page) => list(page).locator('tbody th').allInnerTexts()

/** One column of the list from the top: 1 is G gespeeld, 5 is P punten, 6 is D doelsaldo. */
const columnFigures = async (page: Page, column: number) =>
  (await list(page).locator(`tbody td:nth-of-type(${column})`).allInnerTexts()).map((text) =>
    Number.parseInt(text.replace('\u2212', '-'), 10),
  )

test.describe('sorting the list', () => {
  test('sorts with the keyboard, keeps the focus on the button and says what happened', async ({ page }) => {
    await page.goto('/tegenstanders')

    const played = page.getByRole('button', { exact: true, name: 'G gespeeld' })
    // The line of the table is a div. The switch Welke wedstrijden has a line of its own, a p.
    const status = page.locator('div[role="status"]')
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
    await page.goto('/tegenstanders')
    await page.getByRole('button', { exact: true, name: 'G gespeeld' }).click()
    await page.getByRole('button', { exact: true, name: 'Club' }).click()

    const collator = new Intl.Collator('nl', { sensitivity: 'base' })
    const names = await clubNames(page)

    expect(names).toEqual([...names].toSorted(collator.compare))
    await expect(page.locator('div[role="status"]')).toHaveText('Gesorteerd op Club, van A tot Z')

    await page.getByRole('button', { exact: true, name: 'Club' }).click()

    expect(await clubNames(page)).toEqual(names.toReversed())
  })

  for (const choice of ['', '?competitie=eredivisie']) {
    test(`has the columns Punten and Doelsaldo${choice === '' ? '' : ' with the Eredivisie'}, and sorts on them`, async ({
      page,
    }) => {
      await page.goto(`/tegenstanders${choice}`)

      await expect(page.getByRole('columnheader', { exact: true, name: 'P punten' })).toHaveAttribute(
        'aria-sort',
        'none',
      )
      await expect(page.getByRole('columnheader', { exact: true, name: 'D doelsaldo' })).toHaveAttribute(
        'aria-sort',
        'none',
      )
      await expect(list(page).locator('thead th')).toHaveCount(7)

      await page.getByRole('button', { exact: true, name: 'P punten' }).click()

      const points = await columnFigures(page, 5)

      expect(points.length).toBeGreaterThan(0)
      expect(points).toEqual([...points].toSorted((a, b) => b - a))
      await expect(page.locator('div[role="status"]')).toHaveText('Gesorteerd op Punten, van hoog naar laag')

      await page.getByRole('button', { exact: true, name: 'D doelsaldo' }).click()

      const differences = await columnFigures(page, 6)

      expect(differences.length).toBeGreaterThan(0)
      expect(differences).toEqual([...differences].toSorted((a, b) => b - a))
      await expect(page.getByRole('columnheader', { exact: true, name: 'D doelsaldo' })).toHaveAttribute(
        'aria-sort',
        'descending',
      )
      await expect(page.locator('div[role="status"]')).toHaveText('Gesorteerd op Doelsaldo, van hoog naar laag')
      expect(await list(page).locator('tbody td:nth-of-type(6)').first().innerText()).toMatch(/^([+−]\d+|0)$/)
    })
  }

  test('fits a phone of 320 pixels, with the arrow and every column', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 320 })
    await page.goto('/tegenstanders?competitie=eredivisie')
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
    await page.goto('/tegenstanders')

    await expect(page.getByRole('button')).toHaveCount(0)
    await expect(list(page).getByRole('columnheader', { exact: true, name: 'gespeeld' })).toBeVisible()

    const names = await clubNames(page)

    expect(names.length).toBeGreaterThan(1)
    expect(names).toEqual([...names].toSorted(new Intl.Collator('nl', { sensitivity: 'base' }).compare))
  })

  test('the switch of the list is two links, and a club we only met in the cup leaves the list', async ({ page }) => {
    await page.goto('/tegenstanders')

    const choices = page.getByRole('group', { name: 'Welke wedstrijden' })

    await expect(list(page).getByRole('rowheader', { name: 'FC Maquette' })).toBeVisible()
    await choices.getByRole('link', { name: 'Eredivisie' }).click()

    await expect(page).toHaveURL(/\/tegenstanders\?competitie=eredivisie$/)
    await expect(page.getByRole('rowheader', { name: 'FC Maquette' })).toHaveCount(0)
    await expect(list(page).getByRole('rowheader', { name: 'Testdorp FC' })).toBeVisible()
  })

  test('the page of a club we only met in the cup says so with the choice Eredivisie', async ({ page }) => {
    await page.goto('/tegenstanders/fc-maquette?competitie=eredivisie')

    await expect(page.getByText('In de Eredivisie hebben we nog niet tegen deze club gespeeld.')).toBeVisible()
    await page.getByRole('link', { name: 'Alle wedstrijden' }).click()

    await expect(page).toHaveURL(/\/tegenstanders\/fc-maquette$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Onze uitslagen tegen FC Maquette' })).toBeVisible()
  })
})

test.describe('the card Toeschouwers tegen <club>', () => {
  test('has the average and the largest number of the home matches, and the table in an uitklapper', async ({
    page,
  }) => {
    await page.goto('/tegenstanders/testdorp-fc')

    const card = page.getByRole('region', { name: 'Toeschouwers tegen Testdorp FC' })

    await expect(card.getByRole('heading', { level: 2 })).toHaveText('Toeschouwers tegen Testdorp FC')
    await expect(card).toContainText('Gemiddeld')
    await expect(card).toContainText('toeschouwers per thuiswedstrijd')
    await expect(card).toContainText('Het meest: 21.022, in het seizoen')
    await expect(card).toContainText('Het aantal toeschouwers is een schatting, volgens Wikipedia.')
    await expect(card.getByRole('table')).toBeHidden()

    await card.getByText('Aantal per thuiswedstrijd').click()

    await expect(card.getByRole('table')).toBeVisible()
    await expect(card.getByRole('cell', { name: 'Niet bekend' })).toBeVisible()
    await expect(card.getByRole('cell', { name: 'Zonder publiek' })).toBeVisible()
  })

  test('is not on the page of a club that has no known number at a home match', async ({ page }) => {
    await page.goto('/tegenstanders/fc-maquette')

    await expect(page.getByRole('region', { name: /^Toeschouwers tegen/ })).toHaveCount(0)
  })
})

test.describe('the card Nieuws over <club>', () => {
  test('has the newest five headlines that name the club, as links with the source, and no intro or image', async ({
    page,
  }) => {
    await page.goto('/tegenstanders/testdorp-fc')

    const card = page.getByRole('region', { name: 'Nieuws over Testdorp FC' })
    const links = card.getByRole('listitem').getByRole('link')

    await expect(card.getByRole('heading', { level: 2 })).toHaveText('Nieuws over Testdorp FC')
    await expect(links).toHaveCount(5)
    await expect(card.getByRole('listitem').first()).toContainText('Testkrant')
    await expect(card.locator('img, button')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Alle nieuws over Testdorp FC' })).toHaveCount(0)
  })

  test('is not on the page of a club that no headline names', async ({ page }) => {
    await page.goto('/tegenstanders/voorbeeld-united')

    await expect(page.getByRole('region', { name: /^Nieuws over/ })).toHaveCount(0)
  })
})

test.describe('the page of a club', () => {
  test('has the matches in the main column, the summary before it and the scores and the stadiums in the sidebar', async ({
    page,
  }) => {
    await page.goto('/tegenstanders/voorbeeld-united')

    await expect(page.getByRole('main').getByRole('heading', { level: 2, name: 'Wedstrijden' })).toBeVisible()

    const summary = page.getByRole('region', { name: 'Onze uitslagen' })

    await expect(summary.getByRole('heading', { level: 2 })).toHaveText(['Onze uitslagen tegen Voorbeeld United'])

    const sidebar = page.getByRole('region', { name: 'Meer cijfers, het stadion en de bron' })

    await expect(sidebar.getByRole('heading', { level: 2 })).toHaveText([
      /^Resultaten sinds \d{4}$/,
      'Hoe vaak welke uitslag',
      'De plek van Voorbeeld United en de onze',
      'Stadions',
    ])
    await expect(sidebar.getByText(/^Bron: /)).toBeVisible()
  })

  test('names the stadium of a club that changed it, in the order we saw them', async ({ page }) => {
    await page.goto('/tegenstanders/voorbeeld-united')

    // The checks also seed the season of a year ago, so the made-up names come twice: the old
    // name, the new one, and then both again. A name that returns is a line of its own.
    const items = page.getByRole('region', { name: 'Stadions' }).locator('li')

    await expect(items).toHaveCount(4)
    // The first has "t/m" and a season, the ones in the middle their season, the last "vanaf".
    await expect(items.nth(0)).toContainText(/^t\/m \d{4}\/\d{2}.*Oud Voorbeeldpark$/)
    await expect(items.nth(1)).toContainText(/^\d{4}\/\d{2}.*Voorbeeldpark$/)
    await expect(items.nth(2)).toContainText(/^\d{4}\/\d{2}.*Oud Voorbeeldpark$/)
    await expect(items.nth(3)).toContainText(/^vanaf \d{4}\/\d{2}.*Voorbeeldpark$/)
    await expect(
      page.getByRole('region', { name: 'Stadions' }).getByRole('link', { name: 'Stadions' }),
    ).toHaveAttribute('href', '#stadion')
  })

  test('has the row Laatste wedstrijden for a club with five matches, and none for one with fewer', async ({
    page,
  }) => {
    await page.goto('/tegenstanders/testdorp-fc')

    // The matches of this and the last season are 6–0 each, and the older ones are a draw, a
    // loss and a win (see older-meetings.ts): the oldest first and the newest last.
    await expect(page.locator('.hf-mark-row .hf-visually-hidden')).toHaveText(
      'Laatste wedstrijden: winst, verlies, gelijk, winst, winst',
    )

    for (const club of ['voorbeeld-united', 'fc-maquette']) {
      await page.goto(`/tegenstanders/${club}`)

      await expect(page.getByRole('heading', { level: 2, name: 'Wedstrijden' })).toBeVisible()
      await expect(page.locator('.hf-mark-row')).toHaveCount(0)
    }
  })

  test('has the card Doelpuntenmakers for a club with five matches, in both choices, and none for fewer', async ({
    page,
  }) => {
    // Testdorp FC has five played matches in the league (see older-meetings.ts), so the card is
    // there with both choices, after Hoe vaak welke uitslag. Voorbeeld United has four.
    for (const choice of ['', '?competitie=eredivisie']) {
      await page.goto(`/tegenstanders/testdorp-fc${choice}`)

      const card = page.getByRole('region', { name: 'Doelpuntenmakers tegen Testdorp FC' })

      await expect(card.getByRole('heading', { level: 2 })).toBeVisible()
      await expect(
        card.getByRole('table', { name: /^Doelpuntenmakers van sc Heerenveen tegen Testdorp FC, in de Eredivisie/ }),
      ).toBeVisible()
      await expect(
        card.getByText(/^\d+ spelers hebben gescoord$|^De top 5 van \d+ spelers die scoorden$/),
      ).toBeVisible()
      await expect(card.getByText(/^De doelpuntenmakers van \d+ van de \d+ gespeelde wedstrijden$/)).toBeVisible()
      // Players with the same goals share a row, so the made-up data has a row with commas.
      await expect(
        card
          .getByRole('rowheader')
          .filter({ hasText: /\w, \w/u })
          .first(),
      ).toBeVisible()
    }

    await page.goto('/tegenstanders/testdorp-fc')
    await expect(page.getByRole('region', { name: 'Onze uitslagen' }).getByRole('heading', { level: 2 })).toContainText(
      ['Onze uitslagen tegen Testdorp FC'],
    )
    await expect(page.getByRole('main').getByRole('region').getByRole('heading', { level: 2 })).toContainText([
      'Hoe vaak welke uitslag',
      'Doelpuntenmakers tegen Testdorp FC',
    ])

    await page.goto('/tegenstanders/voorbeeld-united')
    await expect(page.getByRole('heading', { level: 2, name: /^Doelpuntenmakers tegen/ })).toHaveCount(0)
  })

  test('has no card Stadion for a club whose only league match was at home, and none for the cup', async ({ page }) => {
    for (const club of ['testdorp-fc', 'fc-maquette']) {
      await page.goto(`/tegenstanders/${club}`)

      await expect(page.getByRole('heading', { level: 2, name: /^Onze uitslagen/ })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: /^Stadions?$/ })).toHaveCount(0)
    }
  })
})

test.describe('the bar of Wedstrijden', () => {
  test('marks Tegenstanders on the list and on the page of a club, and leads from Wedstrijden to it', async ({
    page,
  }) => {
    const bar = page.getByRole('navigation', { name: 'Hoofdmenu' })

    await page.goto('/wedstrijden')
    await bar.getByRole('link', { name: 'Tegenstanders' }).click()

    await expect(page).toHaveURL(/\/tegenstanders$/)
    await expect(bar.getByRole('link', { name: 'Tegenstanders' })).toHaveAttribute('aria-current', 'page')
    await expect(bar.getByRole('link', { name: 'Wedstrijden' })).toHaveAttribute('aria-current', 'true')
    await expect(bar.getByRole('link', { name: 'Cijfers' })).not.toHaveAttribute('aria-current', /.*/)

    await list(page).getByRole('link', { name: 'Testdorp FC' }).click()

    await expect(bar.getByRole('link', { name: 'Tegenstanders' })).toHaveAttribute('aria-current', 'page')
    await expect(bar.getByRole('link', { name: 'Wedstrijden' })).toHaveAttribute('aria-current', 'true')
  })

  test('has the links of Spelers instead on Spelers', async ({ page }) => {
    await page.goto('/spelers')

    const links = page.getByRole('navigation', { name: 'Hoofdmenu' }).locator('.hf-navigation-bar').getByRole('link')

    await expect(links).toHaveText(['Cijfers', 'Overzicht', 'Zoeken'])
  })
})

test.describe('the matches to come on the page of a club', () => {
  test('has them in the list of the card, with no subheadings and no sentence, for a club not played yet', async ({
    page,
  }) => {
    await page.goto('/tegenstanders/nepstad-rangers')

    const card = page.getByRole('region', { name: 'Wedstrijden' })

    await expect(card.getByRole('heading', { level: 3 })).toHaveCount(0)
    await expect(card.getByRole('list').first().getByRole('listitem')).toHaveCount(1)
    await expect(card.getByRole('listitem').first()).toContainText('Nepstad Rangers')
    await expect(card.getByRole('listitem').first()).toContainText('Eredivisie · Speelronde 4')
    await expect(page.getByText('We hebben nog niet tegen deze club gespeeld.')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: /^Onze uitslagen/ })).toHaveCount(0)
    // Without a played match there is no summary, but the credit is still there.
    await expect(page.getByRole('region', { name: 'De bron' }).getByText(/^Bron: /)).toBeVisible()
  })

  test('shows a match that is called off with "Uitgesteld"', async ({ page }) => {
    await page.goto('/tegenstanders/demo-boys')

    await expect(page.getByRole('region', { name: 'Wedstrijden' }).getByText('Uitgesteld').first()).toBeVisible()
  })

  test('leaves out a cup tie with the choice Eredivisie, and brings it back with Alle wedstrijden', async ({
    page,
  }) => {
    await page.goto('/tegenstanders/sv-proefdorp?competitie=eredivisie')

    const card = page.getByRole('region', { name: 'Wedstrijden' })

    await expect(page.getByText('In de Eredivisie hebben we nog niet tegen deze club gespeeld.')).toBeVisible()
    await expect(card.getByText('KNVB Beker')).toHaveCount(0)
    await page.getByRole('link', { name: 'Alle wedstrijden' }).click()

    await expect(page).toHaveURL(/\/tegenstanders\/sv-proefdorp$/)
    await expect(card.getByText('KNVB Beker · Tweede ronde')).toBeVisible()
  })
})
