/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  overrides: [
    {
      // Classes that only exist in the Storybook docs start with an underscore. Docs CSS may also target
      // Storybook's own classes (sb-, sbdocs-).
      files: ['**/src/docs/**/*.css'],
      rules: {
        'selector-class-pattern': [
          '^(_hf-docs|sb|sbdocs)(-[a-z0-9]+)+$',
          { message: 'Use _hf-docs- in kebab-case, or a Storybook class' },
        ],
      },
    },
  ],
  plugins: ['stylelint-use-logical', 'stylelint-plugin-use-baseline'],
  // A temporary exception (stylelint-disable) that is no longer needed is an error, so it can't stay behind.
  reportNeedlessDisables: true,
  rules: {
    // Logical properties and values only, so layouts follow the writing direction.
    'csstools/use-logical': 'always',
    // Project prefix hf- (Heerenveen Fansite) for classes and custom properties.
    'custom-property-pattern': ['^hf-[a-z0-9]+(-[a-z0-9]+)*$', { message: 'Use the hf- prefix in kebab-case' }],
    'layer-name-pattern': '^hf(\\.[a-z]+)*$',
    // Only features that are Baseline widely available. Something newer goes inside @supports.
    'plugin/use-baseline': [true, { available: 'widely' }],
    'selector-class-pattern': ['^hf-[a-z0-9]+(-[a-z0-9]+)*$', { message: 'Use the hf- prefix in kebab-case' }],
  },
}
