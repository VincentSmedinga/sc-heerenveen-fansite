import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// jsdom doesn't apply rules in a cascade layer, so the test reads the text of the files,
// without the comments, which mention the rules in words.
const read = (file: string) =>
  readFileSync(join(import.meta.dirname, '..', file), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('the columns of figures', () => {
  const table = read('base/table.css')

  it('are as wide as their figures: room for two digits, the smallest width, one line', () => {
    expect(table).toMatch(
      /:is\(th, td\)\.hf-numeric \{[^}]*box-sizing: content-box;[^}]*inline-size: 1%;[^}]*min-inline-size: 2ch;[^}]*white-space: nowrap;/u,
    )
  })

  it('give up half of their padding in a table narrower than 24rem, before any of their content', () => {
    expect(table).toMatch(
      /@container hf-table \(inline-size < 24rem\) \{\s*:is\(th, td\)\.hf-numeric \{\s*padding-inline: var\(--hf-space-xs\);/u,
    )
  })

  it('still end their figures at the end of the cell', () => {
    expect(table).toMatch(/:is\(th, td\)\.hf-numeric \{[^}]*text-align: end;/u)
  })
})

describe('the tables', () => {
  it('sit in a container of their own width, by a name, and no rule of a table asks for the window', () => {
    expect(read('base/table.css')).toMatch(/\.hf-table-container \{\s*container: hf-table \/ inline-size;\s*\}/u)
    expect(read('components/bar/bar.css')).toMatch(/container-name: hf-bar-place hf-table;/u)
    expect(read('components/data-table/data-table.css')).toMatch(
      /container: hf-data-table-fold hf-table \/ inline-size;/u,
    )
    expect(read('base/table.css')).not.toMatch(/@media[^{]*width/u)
    expect(read('components/data-table/data-table.css')).not.toMatch(/@media[^{]*width/u)
    expect(read('components/player-figures-table/player-figures.css')).not.toMatch(/@media[^{]*width/u)
  })

  it('give a sortable table less room in a table narrower than 24rem, and the same room above it', () => {
    expect(read('components/data-table/data-table.css')).toMatch(
      /@container hf-table \(inline-size >= 24rem\) \{\s*\.hf-data-table-sortable :is\(th, td\)\.hf-numeric \{\s*padding-inline: var\(--hf-space-xs\);/u,
    )
  })

  it('give the figures of the players more room in a place of 24rem, by the container of the place', () => {
    expect(read('components/player-figures-table/player-figures.css')).toMatch(
      /@container hf-bar-place \(inline-size >= 24rem\) \{\s*th\.hf-numeric,/u,
    )
  })
})

describe('the icons in the headers of the tables and in the events', () => {
  it.each(['components/table-column-icon/table-column-icon.css', 'components/match-event-icon/match-event-icon.css'])(
    'have no largest width, so the base styles do not shrink them in a column as narrow as its figures (%s)',
    (file) => {
      expect(read(file)).toMatch(/max-inline-size: none;/u)
    },
  )
})

describe('the table of the figures of the players', () => {
  it('lets its columns be as wide as their figures, as eight columns with two digits do not fit 320 pixels', () => {
    expect(read('components/player-figures-table/player-figures.css')).toMatch(/min-inline-size: 0;/u)
  })
})
