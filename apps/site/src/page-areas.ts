import type { Page } from '@fansite/design-system'
import type { ComponentProps } from 'react'

type PageAreas = NonNullable<ComponentProps<typeof Page.Main>['areas']>

type PageAreasOptions = {
  /** The cells beside the main content that stand after it in the source, such as a sidebar. */
  after?: readonly string[]
  /** The page has a link back above its heading, in an area of its own (`back`). */
  back?: boolean
  /** The cells beside the main content that stand before it in the source, first on a phone. */
  before?: readonly string[]
  /** The page has no visible heading cell, such as the homepage, so it has no row for it. */
  head?: boolean
  /**
   * The cells of the main content, one for each card, from top to bottom. Defaults to a single
   * cell called `main`.
   */
  main?: readonly string[]
  /** The cells beside the main content stand in the first column, like filters. */
  start?: boolean
  /** The page has a Page.Toolbar, beside its heading from 52rem and under it on a phone. */
  toolbar?: boolean
}

/**
 * The areas of a page: the link back, the heading, the cells of the main content and the cells
 * beside it. The order in the source is the order on a phone: the link back, the heading, the
 * toolbar, `before`, `main`, then `after`. On a wide screen the link back has a row of its own
 * across the page, the heading stands in the first column and the toolbar in the second, in
 * one row. The main content stands in one column and the cells beside it in the other, each in
 * its own rows, and the last of a shorter column runs on over the rows that are left. A page
 * without cells beside its main content gives it both columns.
 */
export const pageAreas = ({
  after = [],
  back = false,
  before = [],
  head = true,
  main = ['main'],
  start = false,
  toolbar = false,
}: PageAreasOptions): PageAreas => {
  const top = [...(back ? ['back'] : []), ...(head ? ['head'] : []), ...(toolbar ? ['toolbar'] : [])]
  // The toolbar stands in the second column, in the row of the heading. Without a heading it
  // has a row of its own.
  const topWide = [
    ...(back ? ['back back'] : []),
    ...(head && toolbar ? ['head toolbar'] : head ? ['head head'] : toolbar ? ['toolbar toolbar'] : []),
  ]

  const beside = [...before, ...after]

  if (beside.length === 0) {
    return { narrow: [...top, ...main], wide: [...topWide, ...main.map((name) => `${name} ${name}`)] }
  }

  const rows = Math.max(main.length, beside.length)
  const wide = Array.from({ length: rows }, (_, index) => {
    const content = main[Math.min(index, main.length - 1)]
    const other = beside[Math.min(index, beside.length - 1)]

    return start ? `${other} ${content}` : `${content} ${other}`
  })

  return { narrow: [...top, ...before, ...main, ...after], wide: [...topWide, ...wide] }
}
