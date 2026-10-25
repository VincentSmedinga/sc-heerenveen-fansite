// Conventional Commits, checked in the commit-msg hook and, in CI, on pull request titles: a
// squash merge turns the title into the commit on main, and release-please reads those commits.
export default {
  extends: ['@commitlint/config-conventional'],
}
