import { describe, expect, it } from 'vitest'

import { clubColourOf, clubColours, isClubColour, noClubColour } from './club-colours.ts'

describe('clubColours', () => {
  it('has only checked colours, and none of them white', () => {
    for (const [slug, colour] of Object.entries(clubColours)) {
      expect(colour === null || (isClubColour(colour) && colour !== '#ffffff'), slug).toBe(true)
    }
  })

  it('gives Ajax and PSV red, and PEC Zwolle blue', () => {
    expect(clubColours['ajax']).toBe('#e30613')
    expect(clubColours['psv']).toBe('#e30613')
    expect(clubColours['pec-zwolle']).toBe('#005baa')
  })
})

describe('clubColourOf', () => {
  it('takes the list without a choice, and none for a club that is not in it or has none', () => {
    expect(clubColourOf('feyenoord', null)).toBe('#e30613')
    expect(clubColourOf('sneek', null)).toBeNull()
    expect(clubColourOf('no-such-club', null)).toBeNull()
    expect(clubColourOf('constructor', null)).toBeNull()
  })

  it('lets the choice of an editor win over the list', () => {
    expect(clubColourOf('feyenoord', '#00853e')).toBe('#00853e')
    expect(clubColourOf('sneek', '#00853e')).toBe('#00853e')
    expect(clubColourOf('feyenoord', noClubColour)).toBeNull()
  })

  it('gives nothing for a choice that is not a checked colour', () => {
    expect(clubColourOf('feyenoord', 'red;position:fixed')).toBeNull()
  })
})
