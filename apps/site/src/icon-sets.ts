import { colourOf, headerColourOf } from './header-colour.ts'

/**
 * A set of icons: the tile that the shield stands on in the apple-touch icon and the maskable
 * icon, and where it goes.
 */
export type IconSet = { folder: string; name: string; tile: string }

/**
 * The sets that scripts/make-icons.js makes, and that icons.test.ts checks. The folders are
 * relative to the root of the repository. The tile of the fansite is the dark blue of its
 * header. Storybook has its own pink, so its tab or bookmark is not taken for the fansite; the
 * Forum has a lighter blue tile (blue-600), which the white rim of the shield stands out on.
 * Only the tile differs: the shield is the logo of the design system, as it is.
 */
export function iconSetsOf(colourCss: string): IconSet[] {
  return [
    { folder: 'apps/site/public', name: 'fansite', tile: headerColourOf(colourCss).light },
    // The brand colour of Storybook, from the favicon that Storybook itself ships
    // (storybook/assets/browser/favicon.svg).
    { folder: 'packages/design-system/src/assets/icons/storybook', name: 'storybook', tile: '#ff4785' },
    // Not used yet: the Forum will take these from the design system.
    {
      folder: 'packages/design-system/src/assets/icons/forum',
      name: 'forum',
      tile: colourOf(colourCss, '--hf-colour-blue-600'),
    },
  ]
}
