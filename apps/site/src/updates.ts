/*
 * The page Updates: which versions it shows and how. This module imports nothing, so the smoke
 * test can use it too, to check the page against the CHANGELOG.md of the build.
 */

/**
 * A released version as visitors see it: its number, its date as `2026-11-03`, and what
 * changed, in Dutch.
 */
export type Release = {
  date: string
  sentences: readonly string[]
  version: string
}

/** The Dutch lines per version, as in release-notes.ts. */
export type ReleaseNotes = Readonly<Record<string, readonly string[]>>

/** The title of the page, and of its feed with the name of the site after it. */
export const updatesTitle = 'Updates'

/** The address of the page. */
export const updatesPath = '/updates'

/** The address of its RSS feed. */
export const feedPath = `${updatesPath}/feed.xml`

// The heading release-please writes above a version: "## 0.1.0 (2026-10-21)" for the first, and
// later ones with a link to the changes since the version before: "##
// [0.2.0](https://github.com/...) (2026-11-03)". Older versions of release-please wrote a patch
// version with three #.
const versionHeading =
  /^#{2,3} (?:\[(?<linked>\d+\.\d+\.\d+)\]\([^)\s]*\)|(?<plain>\d+\.\d+\.\d+)) \((?<date>\d{4}-\d{2}-\d{2})\)$/gm

const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone: 'UTC', year: 'numeric' })

/** The anchor of the heading of a version on the page, such as `versie-0-2-0`. */
export function anchorOf({ version }: Pick<Release, 'version'>) {
  return `versie-${version.replaceAll('.', '-')}`
}

/** The date of a version the Dutch way, such as "3 november 2026". */
export function dateOf({ date }: Pick<Release, 'date'>) {
  return dateFormat.format(new Date(`${date}T00:00:00Z`))
}

/**
 * The id the heading of a version had before anchors had rules, such as `versie-0.2.0`. It
 * stays as an old anchor on the heading. The feed still links to it: that link is the guid of
 * the item, and a new guid would show every version as new in a feed reader.
 */
export function oldAnchorOf({ version }: Pick<Release, 'version'>) {
  return `versie-${version}`
}

/** The versions in a CHANGELOG.md by release-please, in the order of the file: newest first. */
export function parseChangelog(changelog: string) {
  return [...changelog.matchAll(versionHeading)].map(({ groups = {} }) => ({
    date: groups['date'] ?? '',
    version: groups['linked'] ?? groups['plain'] ?? '',
  }))
}

/**
 * The versions in the changelog that have lines, in the order of the changelog. A version shows
 * only once it is released, so lines written ahead wait for it. A version without lines is left
 * out.
 */
export function releasesOf(changelog: string, notes: ReleaseNotes): Release[] {
  return parseChangelog(changelog).flatMap(({ date, version }) => {
    const sentences = notes[version] ?? []

    return sentences.length === 0 ? [] : [{ date, sentences, version }]
  })
}
