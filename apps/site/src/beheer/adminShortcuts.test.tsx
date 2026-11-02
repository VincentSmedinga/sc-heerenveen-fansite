import { describe, expect, it, vi } from 'vitest'

import { adminShortcuts } from './adminShortcuts'

vi.mock('./AdminBar', () => ({ AdminBar: () => null }))

const pathname = (rest?: string[]) => (adminShortcuts(rest) as null | { props: { pathname: string } })?.props.pathname

describe('the bar of the admin in the slot', () => {
  it('hands the bar the path of the page, also for the start page', () => {
    expect(pathname()).toBe('/beheer')
    expect(pathname(['berichten'])).toBe('/beheer/berichten')
    expect(pathname(['artikelen', '12'])).toBe('/beheer/artikelen/12')
  })

  it('draws no bar on the login pages, where nobody is logged in', () => {
    expect(adminShortcuts(['inloggen'])).toBeNull()
    expect(adminShortcuts(['inloggen', 'verstuurd'])).toBeNull()
  })
})
