import type { Page } from '@fansite/design-system'
import type { ComponentProps } from 'react'

type PageAreas = NonNullable<ComponentProps<typeof Page.Main>['areas']>

type PageAreasOptions = {
  /** The cells beside the main content that stand after it in the source, such as a sidebar. */
  after?: readonly string[]
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
  /** The page has a Page.Toolbar under its heading. */
  toolbar?: boolean
}

/**
 * The areas of a page: the heading, the cells of the main content and the cells beside it. The
 * order in the source is the order on a phone: the heading, the toolbar, `before`, `main`, then
 * `after`. On a wide screen the main content stands in one column and the cells beside it in
 * the other, each in its own rows, and the last of a shorter column runs on over the rows that
 * are left. A page without cells beside its main content gives it both columns.
 */
export const pageAreas = ({
  after = [],
  before = [],
  head = true,
  main = ['main'],
  start = false,
  toolbar = false,
}: PageAreasOptions): PageAreas => {
  const top = [...(head ? ['head'] : []), ...(toolbar ? ['toolbar'] : [])]
  const topWide = [...(head ? ['head head'] : []), ...(toolbar ? ['toolbar toolbar'] : [])]

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
