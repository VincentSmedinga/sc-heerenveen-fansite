/*
 * The icons of the published Storybook (ds.heerenveen.org), as the fansite declares them: the
 * SVG for the tab, the ICO for browsers that ask for /favicon.ico themselves, and the
 * apple-touch icon (180 by 180, no transparency) that Safari shows in its favourites. The files
 * are in src/assets/icons/storybook, made by `pnpm --filter site icons`, and main.ts serves
 * them from the root. The manager (index.html) leaves out its own icon when the head has one,
 * so the pink S of Storybook is gone from the tab. The preview (iframe.html) has no icon of its
 * own, but is a page too.
 */

export const iconTags = [
  '<link rel="icon" type="image/svg+xml" href="./icon.svg">',
  '<link rel="icon" type="image/x-icon" sizes="16x16 32x32 48x48" href="./favicon.ico">',
  '<link rel="apple-touch-icon" type="image/png" sizes="180x180" href="./apple-touch-icon.png">',
].join('')

/** Adds the tags to a head. In every build and in the dev server, like the noindex tag. */
export const addIconsTo = (head: string) => `${head}${iconTags}`
