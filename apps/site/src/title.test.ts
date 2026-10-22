import { describe, expect, it } from 'vitest'

import { withBranch } from './title'

describe('withBranch', () => {
  it('puts the branch in front of the title', () => {
    expect(withBranch('Onze bronnen – sc Heerenveen Fansite', 'feat/120-bigger-type')).toBe(
      'feat/120-bigger-type · Onze bronnen – sc Heerenveen Fansite',
    )
  })

  it('keeps the %s of a title template', () => {
    expect(withBranch('%s – sc Heerenveen Fansite', 'main')).toBe('main · %s – sc Heerenveen Fansite')
  })

  it('leaves the title as it is without a branch', () => {
    expect(withBranch('Onze bronnen', undefined)).toBe('Onze bronnen')
  })

  it('shows no branch outside the dev server', () => {
    expect(withBranch('Onze bronnen')).toBe('Onze bronnen')
  })
})
