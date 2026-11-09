import { describe, expect, it } from 'vitest'

import * as counts from './items-per-card'

describe('the counts of the lists', () => {
  it('allow the sizes 5, 10, 20 and 50 only', () => {
    expect(counts.listSizes).toEqual([5, 10, 20, 50])
  })

  it('are all one of those sizes', () => {
    const numbers = Object.entries(counts).filter(([name]) => name !== 'listSizes' && name !== 'headlineWindowDays')

    expect(numbers.length).toBeGreaterThan(0)
    for (const [name, value] of numbers) {
      expect(counts.listSizes as readonly unknown[], name).toContain(value)
    }
  })

  it('show 5 items on a card by default, 5 to 20 headlines on the homepage and 50 on a page of /nieuws', () => {
    expect(counts.itemsPerCard).toBe(5)
    expect(counts.fewestHeadlines).toBe(5)
    expect(counts.mostHeadlines).toBe(20)
    expect(counts.headlineWindowDays).toBe(3)
    expect(counts.headlinesPerPage).toBe(50)
    expect(counts.articlesPerPage).toBe(10)
  })
})
