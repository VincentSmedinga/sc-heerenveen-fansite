import { expect, type Page, test } from '@playwright/test'

// The slide of the thumb of a switch between two pages joins the elements with the same
// view-transition name on the old and the new page. A name belongs to the place of the switch,
// so a click from Wedstrijden to Statistieken joins nothing, and the thumb does not fly from
// the card Stand to the top of the other page. The same switch after another choice keeps its
// names.

/** The names of the thumb and of the first option of the switch with this name, as computed. */
async function names(page: Page, group: string) {
  return page.getByRole('group', { name: group }).evaluate((element) => ({
    option: getComputedStyle(element.firstElementChild as Element).viewTransitionName,
    thumb: getComputedStyle(element, '::before').viewTransitionName,
  }))
}

const switches = [
  { group: 'Welke stand', other: '/wedstrijden?stand=laatste-5', path: '/wedstrijden' },
  { group: 'Welke wedstrijden', other: '/statistieken?competitie=eredivisie', path: '/statistieken' },
  { group: 'Welke wedstrijden', other: '/statistieken/spelers?competitie=eredivisie', path: '/statistieken/spelers' },
  {
    group: 'Welke wedstrijden',
    other: '/statistieken/tegenstanders?competitie=eredivisie',
    path: '/statistieken/tegenstanders',
  },
] as const

test('a switch has names of its own place, which no other page shares', async ({ page }) => {
  const seen: string[] = []

  for (const { group, path } of switches) {
    await page.goto(path)

    const { option, thumb } = await names(page, group)

    expect(thumb).toMatch(/^hf-segmented-thumb-[a-z-]+$/)
    expect(option).toMatch(/^hf-segmented-option-[a-z-]+-1$/)
    seen.push(thumb, option)
  }

  expect(new Set(seen).size).toBe(seen.length)
})

for (const { group, other, path } of switches) {
  test(`the switch on ${path} keeps its names for another choice, so the thumb slides`, async ({ page }) => {
    await page.goto(path)
    const before = await names(page, group)

    await page.goto(other)

    expect(await names(page, group)).toEqual(before)
  })
}
