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
        const card = element.closest('.hf-card') ?? element.parentElement
        const tableBox = element.getBoundingClientRect()
        const cardBox = (card as HTMLElement).getBoundingClientRect()

        return tableBox.left >= cardBox.left - 1 && tableBox.right <= cardBox.right + 1
      })

      expect(fits).toBe(true)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true)
    })
  }
}
