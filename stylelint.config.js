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
  plugins: ['stylelint-use-logical'],
  rules: {
    // Logical properties and values only, so layouts follow the writing direction.
    'csstools/use-logical': 'always',
    // Project prefix hf- (Heerenveen Fansite) for classes and custom properties.
    'custom-property-pattern': ['^hf-[a-z0-9]+(-[a-z0-9]+)*$', { message: 'Use the hf- prefix in kebab-case' }],
    'layer-name-pattern': '^hf(\\.[a-z]+)*$',
    'selector-class-pattern': ['^hf-[a-z0-9]+(-[a-z0-9]+)*$', { message: 'Use the hf- prefix in kebab-case' }],
  },
}
