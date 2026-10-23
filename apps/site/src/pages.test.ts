import { describe, expect, it } from 'vitest'

import { pages, shareImage } from './pages'

describe('the pages', () => {
  it.each(pages)('describes $path in 70 to 160 characters', ({ description }) => {
    expect(description.length).toBeGreaterThanOrEqual(70)
    expect(description.length).toBeLessThanOrEqual(160)
  })

  it('has a description of its own for each page', () => {
    expect(new Set(pages.map(({ description }) => description)).size).toBe(pages.length)
  })

  it('lists each path once, from the root, without a query or an anchor', () => {
    const paths = pages.map(({ path }) => path)

    expect(new Set(paths).size).toBe(paths.length)

    for (const path of paths) {
      expect(path).toMatch(/^\/[^?#]*$/)
    }
  })

  it('shows a shared link a PNG of 1200 by 630 pixels, with a description of the picture', () => {
    expect(shareImage).toMatchObject({ height: 630, width: 1200 })
    expect(shareImage.path).toMatch(/^\/[\w-]+\.png$/)
    expect(shareImage.alt).not.toBe('')
  })
})
