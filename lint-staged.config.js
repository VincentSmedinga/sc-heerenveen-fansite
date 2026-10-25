// Fixes what it can in the staged files before each commit; CI runs the full checks, including
// the typecheck. The globs don't overlap, so no two tasks write to the same file at once.
export default {
  '!(*.{css,js,ts,tsx})': 'prettier --write --ignore-unknown',
  '*.css': ['stylelint --fix', 'prettier --write'],
  '*.{js,ts,tsx}': ['eslint --fix --no-warn-ignored', 'prettier --write'],
}
