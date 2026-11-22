import { describe, expect, it } from 'vitest'

import { rulesShortcuts } from './rules-shortcuts'

describe('the bar "Op deze pagina" of the rules', () => {
  it('has the games that are on in the order of the cards, and Account last', () => {
    expect(rulesShortcuts(() => true).map(({ href }) => href)).toEqual(['#prognose', '#uitblinker', '#account'])
  })

  it('leaves out a game that is off', () => {
    expect(rulesShortcuts((part) => part === 'uitblinker').map(({ href }) => href)).toEqual(['#uitblinker', '#account'])
    expect(rulesShortcuts(() => false).map(({ href }) => href)).toEqual(['#account'])
  })
})
