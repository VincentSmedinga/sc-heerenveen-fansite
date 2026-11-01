import { describe, expect, it } from 'vitest'

import * as counts from './items-per-card'

describe('the counts of the lists', () => {
  it('allow the sizes 5, 10, 20 and 50 only', () => {
    expect(counts.listSizes).toEqual([5, 10, 20, 50])
  })

  it('are all one of those sizes', () => {
    const numbers = Object.entries(counts).filter(([name]) => name !== 'listSizes')

    expect(numbers.length).toBeGreaterThan(0)
    for (const [name, value] of numbers) {
      expect(counts.listSizes as readonly unknown[], name).toContain(value)
    }
  })

  it('show 5 items on a card by default, and 50 headlines on a page of /nieuws', () => {
    expect(counts.itemsPerCard).toBe(5)
    expect(counts.firstHeadlines).toBe(5)
    expect(counts.headlinesPerPage).toBe(50)
  })
})
