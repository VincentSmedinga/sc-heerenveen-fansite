import { describe, expect, it } from 'vitest'

import { fansMenu } from './fans'

describe('fansMenu', () => {
  it('gives no item while accounts are off, whatever the games say', () => {
    expect(fansMenu({})).toBeUndefined()
    expect(fansMenu({ FANS_ACCOUNTS: 'off', FANS_PROGNOSE: 'on' })).toBeUndefined()
  })

  it('gives an item without sub-pages when accounts are on and no game is', () => {
    expect(fansMenu({ FANS_ACCOUNTS: 'on' })).toEqual({ subitems: [] })
  })

  it('lists only the games that are on, as Prognose, Uitblinker, Fjouwer and Fantest', () => {
    expect(fansMenu({ FANS_ACCOUNTS: 'on', FANS_FANTEST: 'on', FANS_UITBLINKER: 'on', FANS_VIER: 'on' })).toEqual({
      subitems: [
        { href: '/fans/uitblinker', label: 'Uitblinker' },
        { href: '/fans/fjouwer', label: 'Fjouwer' },
        { href: '/fans/fantest', label: 'Fantest' },
      ],
    })
  })
})
