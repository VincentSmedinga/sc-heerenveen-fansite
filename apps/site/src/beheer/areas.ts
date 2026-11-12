import type { PageMainProps } from '@fansite/design-system'

type PageAreas = NonNullable<PageMainProps['areas']>

/**
 * The areas of a page of the admin with a heading and one block of content, and nothing beside
 * it. The content spans both columns on a wide screen, so the page is as wide as the other
 * pages. A page with a toolbar uses `toolbarAreas`, and a page with a block beside the content
 * has its own areas.
 */
export const adminAreas = {
  narrow: ['head', 'main'],
  wide: ['head head', 'main main'],
} as const satisfies PageAreas

/** The same, with the toolbar under the heading, for the filters and the buttons to save. */
export const toolbarAreas = {
  narrow: ['head', 'toolbar', 'main'],
  wide: ['head head', 'toolbar toolbar', 'main main'],
} as const satisfies PageAreas

/**
 * The areas of a page with a row of cards under the content, across the whole width, such as
 * the actions of a report under the form and the preview.
 */
export const rowAreas = {
  narrow: ['head', 'toolbar', 'main', 'row'],
  wide: ['head head', 'toolbar toolbar', 'main main', 'row row'],
} as const satisfies PageAreas

/** The style of a section that holds its cards side by side where there is room. */
export const rowStyle = { gridTemplateColumns: 'repeat(auto-fit, minmax(min(16rem, 100%), 1fr))' } as const

/** The areas of a page with a block beside the content, such as the spellings of Wikipedia. */
export const sideAreas = {
  narrow: ['head', 'toolbar', 'main', 'side'],
  wide: ['head head', 'toolbar toolbar', 'main side'],
} as const satisfies PageAreas

/**
 * The areas of the start of the admin when something waits: the card Te doen comes before the
 * tiles on a phone and stands in the second column on a wide screen, because it says what to do
 * with the tiles.
 */
export const todoAreas = {
  narrow: ['head', 'todo', 'main'],
  wide: ['head head', 'main todo'],
} as const satisfies PageAreas

/**
 * The areas of a page that is one block in the first column, without a heading of its own over
 * the page: the login pages and the previews of an article. The block is as wide as the main
 * column of the other pages.
 */
export const singleAreas = {
  narrow: ['main'],
  wide: ['main .'],
} as const satisfies PageAreas
