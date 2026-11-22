import { expect, test } from '@playwright/test'

// The e2e server starts with the game on (see playwright.config.ts).
for (const path of ['/fans/prognose', '/fans/spelregels']) {
  for (const width of [320, 1280]) {
    test(`shows the table of the scoring inside its card, without sideways scrolling, on ${path} at ${width} pixels`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 800, width })
      await page.goto(path)

      const table = page.getByRole('table', { name: /Wat een voorspelling oplevert|Punten per onderdeel/ })

      await expect(table).toBeVisible()
      await expect(table.getByRole('rowheader', { name: 'Eén doelpuntental goed' })).toBeVisible()

      const fits = await table.evaluate((element) => {
        const card = element.closest('.hf-card')

        if (card === null) {
          return null
        }

        const tableBox = element.getBoundingClientRect()
        const cardBox = card.getBoundingClientRect()

        return tableBox.left >= cardBox.left - 1 && tableBox.right <= cardBox.right + 1
      })

      expect(fits, 'the table sits in a card, and inside it').toBe(true)

      // The row header breaks at spaces, and a long word at a syllable. "Eén doelpuntental
      // goed" takes two lines in the side column and at most four on a phone, never one per
      // letter.
      const lines = await table.getByRole('rowheader', { name: 'Eén doelpuntental goed' }).evaluate((cell) => {
        const lineHeight = Number.parseFloat(getComputedStyle(cell).lineHeight)

        return Math.round(cell.getBoundingClientRect().height / lineHeight)
      })

      expect(lines).toBeLessThanOrEqual(4)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true)
    })
  }
}
