import { describe, expect, it } from 'vitest'

import { lastModifiedOf, momentOf } from './last-modified'

// Friday 23 October 2026, 15:40 Dutch time.
const now = new Date('2026-10-23T13:40:00Z')

describe('momentOf', () => {
  it('reads the Last-Modified of a page', () => {
    expect(momentOf('Thu, 22 Oct 2026 10:00:00 GMT')).toEqual(new Date('2026-10-22T10:00:00Z'))
  })

  it('gives nothing for a source without a version, and for a text that is no moment', () => {
    expect(momentOf(null)).toBeUndefined()
    expect(momentOf(undefined)).toBeUndefined()
    expect(momentOf('')).toBeUndefined()
    expect(momentOf('gisteren')).toBeUndefined()
  })
})

describe('lastModifiedOf', () => {
  it('gives the moment of one source in the notation of the news, with the moment for a machine', () => {
    expect(lastModifiedOf([new Date('2026-10-22T10:00:00Z')], now)).toEqual({
      dateTime: '2026-10-22T10:00:00.000Z',
      text: 'do 12:00',
    })
  })

  it('takes the newest of several sources, in whatever order they come', () => {
    const moments = [
      new Date('2026-10-19T20:15:00Z'),
      new Date('2026-10-23T09:30:00Z'),
      new Date('2026-10-22T10:00:00Z'),
    ]

    expect(lastModifiedOf(moments, now)?.text).toBe('vr 11:30')
    expect(lastModifiedOf([...moments].reverse(), now)?.text).toBe('vr 11:30')
  })

  it('leaves out a source without a moment and takes the others', () => {
    expect(lastModifiedOf([undefined, new Date('2026-10-22T10:00:00Z'), undefined], now)?.text).toBe('do 12:00')
  })

  it('gives nothing when there is no moment at all, and no guess with another date', () => {
    expect(lastModifiedOf([], now)).toBeUndefined()
    expect(lastModifiedOf([undefined], now)).toBeUndefined()
    expect(lastModifiedOf([new Date(Number.NaN)], now)).toBeUndefined()
  })

  it('gives nothing for a moment in the future', () => {
    expect(lastModifiedOf([new Date('2026-10-24T10:00:00Z')], now)).toBeUndefined()
  })

  it('leaves out a moment in the future and takes the newest of the rest', () => {
    expect(lastModifiedOf([new Date('2026-10-24T10:00:00Z'), new Date('2026-10-22T10:00:00Z')], now)?.text).toBe(
      'do 12:00',
    )
  })

  it('shows the weekday and the time within seven days, and the weekday and the date after them', () => {
    // The days that get a time are today and the six days before it: from Saturday 17 October.
    expect(lastModifiedOf([new Date('2026-10-16T22:00:00Z')], now)?.text).toBe('za 00:00')
    expect(lastModifiedOf([new Date('2026-10-16T21:59:00Z')], now)?.text).toBe('vr 16 okt')
  })

  it('adds the year for a moment in another year', () => {
    expect(lastModifiedOf([new Date('2025-10-14T12:00:00Z')], now)?.text).toBe('di 14 okt 2025')
  })

  it('shows the Dutch time and not UTC', () => {
    // 23:30 UTC on Thursday is half past one on Friday in the Netherlands.
    expect(lastModifiedOf([new Date('2026-10-22T23:30:00Z')], now)?.text).toBe('vr 01:30')
  })
})
