import { releaseNotes } from './release-notes'
import { releasesOf } from './updates'

/**
 * The text of CHANGELOG.md, which release-please writes in the root of the repository. The
 * bundler puts it into the code when the site is built (see the rule for `?raw` in
 * next.config.ts), so the server needs no file. Until the first release the file doesn't exist,
 * the pattern finds nothing and the text is empty. The smoke test checks that the page shows
 * what the file says. The text is the default export of the module. Turbopack renames that
 * export in a build, and `import: 'default'` then finds nothing, so this reads it from the
 * module itself.
 */
const changelog =
  Object.values(import.meta.glob<{ default: string }>('../../../CHANGELOG.md', { eager: true, query: '?raw' }))[0]
    ?.default ?? ''

/**
 * The released versions that have Dutch lines, newest first, from the CHANGELOG.md in the
 * build.
 */
export function getReleases() {
  return releasesOf(changelog, releaseNotes)
}
