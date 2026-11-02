/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  overrides: [
    {
      // Classes that only exist in the Storybook docs start with an underscore. Docs CSS may
      // also target Storybook's own classes (sb-, sbdocs-). The docs are not part of the site,
      // so they set their own vertical margins.
      files: ['**/src/docs/**/*.css'],
      rules: {
        'declaration-property-value-allowed-list': null,
        'selector-class-pattern': [
          '^(_hf-docs|sb|sbdocs)(-[a-z0-9]+)+$',
          { message: 'Use _hf-docs- in kebab-case, or a Storybook class' },
        ],
      },
    },
    {
      // The flow and the utility classes for the space under one element are the two places
      // that set a vertical margin (see the rule below).
      files: ['**/src/utilities/flow.css', '**/src/utilities/space-end.css'],
      rules: {
        'declaration-property-value-allowed-list': null,
      },
    },
  ],
  plugins: ['stylelint-use-logical', 'stylelint-plugin-use-baseline'],
  // A temporary exception (stylelint-disable) that is no longer needed is an error, so it can't
  // stay behind.
  reportNeedlessDisables: true,
  rules: {
    // Logical properties and values only, so layouts follow the writing direction.
    'csstools/use-logical': 'always',
    // Project prefix hf- (Heerenveen Fansite) for classes and custom properties.
    'custom-property-pattern': ['^hf-[a-z0-9]+(-[a-z0-9]+)*$', { message: 'Use the hf- prefix in kebab-case' }],
    // The container decides the vertical space between its children: the flow in
    // utilities/flow.css, and the classes hf-space-end-* in utilities/space-end.css for one
    // instance. An element or a component sets no vertical margin of its own, because it does
    // not know its surroundings; the space between its own parts comes from gap. So margin,
    // margin-block, margin-block-start and margin-block-end may only be 0 anywhere else. A
    // margin that has to stay, such as a negative one that makes room for a focus ring, gets a
    // stylelint-disable-next-line with the reason; reportNeedlessDisables reports one that is
    // no longer needed. The decision is in docs/beslissingen/designsysteem.md, under "Alleen
    // de stroom en de hulpklassen zetten een marge; stylelint bewaakt dat".
    'declaration-property-value-allowed-list': [
      {
        '/^margin(-block(-start|-end)?)?$/': ['0'],
      },
      {
        message:
          'A component sets no vertical margin: the flow (utilities/flow.css) sets the space between the children of a card or a cell, and a class hf-space-end-* sets it under one element. Use gap between the parts of a component. A margin that must stay gets a stylelint-disable-next-line with the reason',
      },
    ],
    // 100vw (and 100svw, 100lvw and 100dvw) includes the scrollbar, so a width of 100vw makes
    // the page scroll sideways where scrollbars take room, as on Windows. Use 100% instead,
    // which is the width of the parent without the scrollbar.
    'declaration-property-value-disallowed-list': [
      {
        '/^(min-|max-)?(width|inline-size)$/': ['/100[sld]?vw/'],
      },
      {
        message:
          'Do not size with 100vw, 100svw, 100lvw or 100dvw: they include the scrollbar, and the page then scrolls sideways. Use 100%',
      },
    ],
    'layer-name-pattern': '^hf(\\.[a-z]+)*$',
    // Only features that are Baseline widely available. Something newer goes inside @supports.
    'plugin/use-baseline': [true, { available: 'widely' }],
    'selector-class-pattern': ['^hf-[a-z0-9]+(-[a-z0-9]+)*$', { message: 'Use the hf- prefix in kebab-case' }],
  },
}
