import { describe, expect, it } from 'vitest'

import { screenNameInitials } from './initials'

describe('screenNameInitials', () => {
  it.each([
    ['Tjalle99', 'T'],
    ['Blauwwit_Sjoerd', 'BS'],
    ['jan de vries', 'JV'],
    ['anne-marie', 'AM'],
    ['99Testfan', 'T'],
    ['Testfan_99', 'T'],
    ['a_b_c', 'AC'],
    ['  Testfan  ', 'T'],
    ['émile', 'É'],
    ['1234', ''],
    ['', ''],
  ])('makes %j into %j', (name, initials) => {
    expect(screenNameInitials(name)).toBe(initials)
  })
})
