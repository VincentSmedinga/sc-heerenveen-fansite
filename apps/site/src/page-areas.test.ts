import { describe, expect, it } from 'vitest'

import { pageAreas } from '#src/page-areas'

describe('pageAreas', () => {
  it('gives a page without cells beside its main content both columns', () => {
    expect(pageAreas({})).toEqual({ narrow: ['head', 'main'], wide: ['head head', 'main main'] })
  })

  it('puts the cells that stand before the main content first on a phone and in the second column on a wide screen', () => {
    expect(pageAreas({ after: ['side'], before: ['filter'] })).toEqual({
      narrow: ['head', 'filter', 'main', 'side'],
      wide: ['head head', 'main filter', 'main side'],
    })
  })

  it('lets the last cell of a shorter column run on over the rows that are left', () => {
    expect(pageAreas({ after: ['side'], main: ['a', 'b', 'c'] })).toEqual({
      narrow: ['head', 'a', 'b', 'c', 'side'],
      wide: ['head head', 'a side', 'b side', 'c side'],
    })
  })

  it('puts the toolbar under the heading on a phone and beside it, in the second column, on a wide screen', () => {
    expect(pageAreas({ toolbar: true })).toEqual({
      narrow: ['head', 'toolbar', 'main'],
      wide: ['head toolbar', 'main main'],
    })
  })

  it('keeps the toolbar in the second column when the cells beside the content stand in the first', () => {
    expect(pageAreas({ before: ['filter'], start: true, toolbar: true }).wide).toEqual(['head toolbar', 'filter main'])
  })

  it('gives the link back a row of its own over the whole width, above the heading and the toolbar', () => {
    expect(pageAreas({ after: ['side'], back: true, toolbar: true })).toEqual({
      narrow: ['back', 'head', 'toolbar', 'main', 'side'],
      wide: ['back back', 'head toolbar', 'main side'],
    })
    expect(pageAreas({ back: true })).toEqual({
      narrow: ['back', 'head', 'main'],
      wide: ['back back', 'head head', 'main main'],
    })
  })

  it('leaves out the row of the heading without one', () => {
    expect(pageAreas({ after: ['side'], head: false })).toEqual({ narrow: ['main', 'side'], wide: ['main side'] })
  })

  it('puts the cells beside the main content in the first column with start', () => {
    expect(pageAreas({ before: ['filter'], start: true })).toEqual({
      narrow: ['head', 'filter', 'main'],
      wide: ['head head', 'filter main'],
    })
  })
})
