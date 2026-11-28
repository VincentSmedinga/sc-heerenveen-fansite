import { describe, expect, it } from 'vitest'

import { capitaliseName } from './player-name.ts'

describe('capitaliseName', () => {
  it('gives a surname in front a capital, whatever the prefix', () => {
    expect(['van Testma', 'van der Voorbeeld', 'da Proef'].map(capitaliseName)).toEqual([
      'Van Testma',
      'Van der Voorbeeld',
      'Da Proef',
    ])
  })

  it('leaves a name that starts with a capital or an apostrophe', () => {
    expect(['Thom van Testma', '’t Hart', "'t Hart", ''].map(capitaliseName)).toEqual([
      'Thom van Testma',
      '’t Hart',
      "'t Hart",
      '',
    ])
  })
})
