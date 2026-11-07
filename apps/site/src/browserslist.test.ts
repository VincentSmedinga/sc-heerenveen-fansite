import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', file), 'utf8')) as {
    browserslist?: string[]
    sideEffects?: string[]
  }

// The oldest versions of the four browsers in Baseline 'widely available' on 7 November 2026:
// the versions that came out at least 30 months before (before 7 May 2024). See "De bouw weet
// welke browsers we ondersteunen" in docs/beslissingen/site.md.
describe('the browsers the build targets', () => {
  it('are the oldest versions of Chrome, Edge, Firefox and Safari that are in Baseline widely available', () => {
    expect(read('apps/site/package.json').browserslist).toEqual([
      'chrome >= 124',
      'edge >= 124',
      'firefox >= 125',
      'safari >= 17.4',
      'ios_saf >= 17.4',
    ])
  })

  it('leaves out of a page the client code of components the page does not use: only the CSS has side effects', () => {
    expect(read('packages/design-system/package.json').sideEffects).toEqual(['**/*.css'])
  })
})
