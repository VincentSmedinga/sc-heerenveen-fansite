import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Public copy calls the Fansite of 1997 to 2006 "de Fansite" or "het archief van de Fansite",
// never "de oude Fansite" (docs/beslissingen/redactie.md). The stored value `Oude fansite` and
// the folder names stay, so only the lines below may say it.
const repositoryRoot = join(import.meta.dirname, '..', '..', '..')
const roots = ['apps/site/src', 'packages/design-system/src']
const wording = /oude\s+fansite/i

/** The comment that names the stored value, and the rule in Redactie that quotes the words. */
const allowed = new Set<string>(['apps/site/src/beheer/formations.ts', 'packages/design-system/src/docs/editorial.mdx'])

const isSource = (name: string) => /\.(ts|tsx|js|mjs|mdx)$/.test(name) && !/\.(test|spec)\.(ts|tsx)$/.test(name)

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(path)
    return isSource(entry.name) ? [path] : []
  })

/** The lines of a text that name the old Fansite, as `line: text`. */
export const findOldFansite = (text: string): string[] =>
  text.split('\n').flatMap((line, index) => (wording.test(line) ? [`${index + 1}: ${line.trim()}`] : []))

describe('the name of the Fansite of 1997 to 2006', () => {
  it('finds a file that says "oude Fansite", in every spelling', () => {
    expect(findOldFansite('a\nDe oude Fansite hield\nb')).toEqual(['2: De oude Fansite hield'])
    expect(findOldFansite("const x = 'Oude fansite'")).toHaveLength(1)
    expect(findOldFansite("dataSource === 'oude-fansite'")).toEqual([])
    expect(findOldFansite('het archief van de Fansite')).toEqual([])
  })

  it('is not said in a source file of the site or the design system', () => {
    const hits = roots.flatMap((root) =>
      sourceFiles(join(repositoryRoot, root))
        .map((path) => relative(repositoryRoot, path))
        .filter((path) => !allowed.has(path))
        .flatMap((path) =>
          findOldFansite(readFileSync(join(repositoryRoot, path), 'utf8')).map((line) => `${path}:${line}`),
        ),
    )
    expect(hits).toEqual([])
  })
})
