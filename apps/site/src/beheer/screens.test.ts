import { describe, expect, it } from 'vitest'

import { currentScreen, isLoginPage, screens, screensFor } from './screens'

describe('the screens of the admin', () => {
  it('shows a moderator Berichten only', () => {
    expect(screensFor('moderator').map(({ label }) => label)).toEqual(['Berichten'])
  })

  it('shows a beheerder every screen, with Beheer as the start', () => {
    expect(screensFor('beheerder').map(({ label }) => label)).toEqual([
      'Beheer',
      'Berichten',
      'Artikelen',
      'Wedstrijden',
      'Stadions',
      'Bezoek',
    ])
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
    ['/beheer/bezoek', '/beheer/bezoek'],
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
