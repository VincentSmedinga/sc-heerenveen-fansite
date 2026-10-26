import { isAnchorId } from '@fansite/design-system'
import { describe, expect, it } from 'vitest'

import { anchorOf, dateOf, oldAnchorOf, parseChangelog, releasesOf } from './updates'

// As release-please writes the first release, and the later ones with a link to the changes
// since the version before.
const changelog = `# Changelog

## [0.3.0](https://github.com/VincentSmedinga/sc-heerenveen-fansite/compare/v0.2.0...v0.3.0) (2026-12-01)


### Features

* **site:** add the archive ([#210](https://github.com/VincentSmedinga/sc-heerenveen-fansite/issues/210))

## [0.2.0](https://github.com/VincentSmedinga/sc-heerenveen-fansite/compare/v0.1.0...v0.2.0) (2026-11-03)


### Bug Fixes

* **site:** show the time in Dutch time ([#200](https://github.com/VincentSmedinga/sc-heerenveen-fansite/issues/200))

## 0.1.0 (2026-10-21)


### Features

* **site:** add the acceptance environment ([#58](https://github.com/VincentSmedinga/sc-heerenveen-fansite/issues/58))
`

describe('parseChangelog', () => {
  it('reads the number and the date of each version, newest first, in both forms of release-please', () => {
    expect(parseChangelog(changelog)).toEqual([
      { date: '2026-12-01', version: '0.3.0' },
      { date: '2026-11-03', version: '0.2.0' },
      { date: '2026-10-21', version: '0.1.0' },
    ])
  })

  it('reads a patch version with three #, as older versions of release-please wrote it', () => {
    expect(parseChangelog('### [0.1.1](https://github.com/compare/v0.1.0...v0.1.1) (2026-10-25)\n')).toEqual([
      { date: '2026-10-25', version: '0.1.1' },
    ])
  })

  it('skips the other headings and lines', () => {
    expect(parseChangelog('# Changelog\n\n### Features\n\n* **site:** 1.2.3 (2026-01-01)\n')).toEqual([])
  })

  it('finds nothing in an empty changelog, as before the first release', () => {
    expect(parseChangelog('')).toEqual([])
  })
})

describe('releasesOf', () => {
  const notes = {
    '0.1.0': ['De eerste versie.'],
    '0.2.0': ['Een verandering.', 'Nog een verandering.'],
    '0.4.0': ['Een zin die vooruit is geschreven.'],
  }

  it('gives the released versions with their sentences, newest first', () => {
    expect(releasesOf(changelog, notes)).toEqual([
      { date: '2026-11-03', sentences: ['Een verandering.', 'Nog een verandering.'], version: '0.2.0' },
      { date: '2026-10-21', sentences: ['De eerste versie.'], version: '0.1.0' },
    ])
  })

  it('leaves out a version without sentences', () => {
    expect(releasesOf(changelog, notes).map(({ version }) => version)).not.toContain('0.3.0')
    expect(releasesOf(changelog, { ...notes, '0.3.0': [] }).map(({ version }) => version)).not.toContain('0.3.0')
  })

  it('shows sentences written ahead only once the changelog has their version', () => {
    expect(releasesOf(changelog, notes).map(({ version }) => version)).not.toContain('0.4.0')

    const released = `## [0.4.0](https://github.com/compare/v0.3.0...v0.4.0) (2027-01-05)\n\n${changelog}`

    expect(releasesOf(released, notes)[0]).toEqual({
      date: '2027-01-05',
      sentences: ['Een zin die vooruit is geschreven.'],
      version: '0.4.0',
    })
  })

  it('gives no versions before the first release', () => {
    expect(releasesOf('', notes)).toEqual([])
  })
})

describe('dateOf', () => {
  it('writes the date the Dutch way', () => {
    expect(dateOf({ date: '2026-11-03' })).toBe('3 november 2026')
  })
})

describe('anchorOf', () => {
  it('names the heading of a version after its number, with hyphens so it follows the rules for an anchor', () => {
    expect(anchorOf({ version: '0.2.0' })).toBe('versie-0-2-0')
    expect(isAnchorId(anchorOf({ version: '12.34.56' }))).toBe(true)
  })

  it('keeps the old id of the heading, which the feed links to', () => {
    expect(oldAnchorOf({ version: '0.2.0' })).toBe('versie-0.2.0')
    expect(oldAnchorOf({ version: '0.2.0' })).not.toBe(anchorOf({ version: '0.2.0' }))
  })
})
