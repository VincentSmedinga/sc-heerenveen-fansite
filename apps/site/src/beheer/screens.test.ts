import { adminRoles, editorRoles } from '@fansite/db/schema'
import { describe, expect, it } from 'vitest'

import { allRoles, currentScreen, isLoginPage, screens, screensFor, workRoles } from './screens'

describe('the screens of the admin', () => {
  it('knows the roles of the schema', () => {
    expect(allRoles).toEqual(adminRoles)
    expect(workRoles).toEqual(editorRoles)
  })

  it('shows an author the start, the articles and his own account', () => {
    expect(screensFor('author').map(({ label }) => label)).toEqual(['Beheer', 'Artikelen', 'Mijn account'])
  })

  const work = [
    'Beheer',
    'Berichten',
    'Artikelen',
    'Wedstrijden',
    'Spelers',
    'Stadions',
    'Clubnamen',
    'Kwaliteit',
    'Bezoek',
  ]

  it('shows an editor every screen but the accounts', () => {
    expect(screensFor('editor').map(({ label }) => label)).toEqual([...work, 'Mijn account'])
  })

  it('shows the owner every screen, the accounts too', () => {
    expect(screensFor('owner').map(({ label }) => label)).toEqual([...work, 'Accounts', 'Mijn account'])
  })

  it('has every address once, below /beheer', () => {
    expect(new Set(screens.map(({ href }) => href)).size).toBe(screens.length)
    expect(screens.every(({ href }) => href === '/beheer' || href.startsWith('/beheer/'))).toBe(true)
  })

  it.each([
    ['/beheer', '/beheer'],
    ['/beheer/berichten', '/beheer/berichten'],
    ['/beheer/artikelen/nieuw', '/beheer/artikelen'],
    ['/beheer/artikelen/12/versies/3', '/beheer/artikelen'],
    ['/beheer/wedstrijden/2025-26', '/beheer/wedstrijden'],
    ['/beheer/kwaliteit/2005-06/zonder-doelpunten', '/beheer/kwaliteit'],
    ['/beheer/bezoek', '/beheer/bezoek'],
    ['/beheer/accounts/4', '/beheer/accounts'],
    ['/beheer/mijn-account', '/beheer/mijn-account'],
  ])('puts %s under %s', (pathname, href) => {
    expect(currentScreen(pathname)).toBe(href)
  })

  it('has no current screen for a path that is none, and does not take a name that only starts alike', () => {
    expect(currentScreen('/beheer/onbekend')).toBeUndefined()
    expect(currentScreen('/beheer/berichtenlijst')).toBeUndefined()
    expect(currentScreen('/over-ons')).toBeUndefined()
  })

  it('knows the login pages, and no other page', () => {
    expect(isLoginPage('/beheer/inloggen')).toBe(true)
    expect(isLoginPage('/beheer/inloggen/bevestigen')).toBe(true)
    expect(isLoginPage('/beheer/inloggenx')).toBe(false)
    expect(isLoginPage('/beheer')).toBe(false)
  })
})
