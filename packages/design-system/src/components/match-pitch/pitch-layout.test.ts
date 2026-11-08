import { describe, expect, it } from 'vitest'

import { isCrowdedFormation, lineUpSize, parseFormation, pitchSpots } from './pitch-layout'

// The formations the form offers, and two with more rows that the design also has to fit.
const formations = [
  '4-3-3',
  '4-4-2',
  '4-2-3-1',
  '3-5-2',
  '3-4-3',
  '4-1-4-1',
  '4-3-1-2',
  '4-4-1-1',
  '4-5-1',
  '5-3-2',
  '5-4-1',
  '3-4-2-1',
  '4-1-2-1-2',
  '3-1-4-2',
]

// The least room on a phone and on a small desktop, in pixels: the width of the pitch, the size
// of a player and the height of the name under it (two lines of small letters).
const portraitWidth = 288
const portraitHeight = (portraitWidth * 11) / 5
const landscapeWidth = 640
const nameHeight = 29

type Box = { height: number; left: number; top: number; width: number }

const overlap = (a: Box, b: Box) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height

describe('parseFormation', () => {
  it('reads the rows of a formation', () => {
    expect(parseFormation('4-2-3-1')).toEqual([4, 2, 3, 1])
    expect(parseFormation('4-1-2-1-2')).toEqual([4, 1, 2, 1, 2])
  })

  it.each([null, undefined, '', '4', '4-3', '4-3-3-1', '4-3-3-0', '6-6', '1-1-1-1-1-5', 'a-b', '4 3 3'])(
    'has no rows for %s',
    (formation) => {
      expect(parseFormation(formation)).toBeNull()
    },
  )

  it('says which formations are crowded: five in a row, or five rows', () => {
    expect(isCrowdedFormation([4, 3, 3])).toBe(false)
    expect(isCrowdedFormation([3, 5, 2])).toBe(true)
    expect(isCrowdedFormation([4, 1, 2, 1, 2])).toBe(true)
  })
})

describe('pitchSpots', () => {
  it('gives no spots when the formation does not fit the players', () => {
    expect(pitchSpots(null, lineUpSize, true)).toBeNull()
    expect(pitchSpots('4-4-3', lineUpSize, true)).toBeNull()
    expect(pitchSpots('4-4-2', 10, true)).toBeNull()
    expect(pitchSpots('4-4-2', 12, true)).toBeNull()
  })

  it('puts the goalkeeper first, then the rows of the formation, each a step further up', () => {
    const spots = pitchSpots('4-3-3', lineUpSize, true) ?? []

    expect(spots).toHaveLength(lineUpSize)
    // sc Heerenveen is at the bottom: the further up the row, the smaller y.
    const ys = spots.map((spot) => spot.portrait.y)
    expect(ys[0]).toBeGreaterThan(ys[1] ?? 0)
    expect(ys.slice(1, 5)).toEqual([ys[1], ys[1], ys[1], ys[1]])
    expect(ys[1]).toBeGreaterThan(ys[5] ?? 0)
    expect(ys[5]).toBeGreaterThan(ys[8] ?? 0)
    expect(spots[0]?.portrait.x).toBe(50)
  })

  it('mirrors the opponent: at the top when upright, on the right when it lies down', () => {
    const ours = pitchSpots('4-4-2', lineUpSize, true) ?? []
    const theirs = pitchSpots('4-4-2', lineUpSize, false) ?? []

    expect(ours[0]?.portrait.y).toBeGreaterThan(50)
    expect(theirs[0]?.portrait.y).toBeLessThan(50)
    expect(ours[0]?.landscape.x).toBeLessThan(50)
    expect(theirs[0]?.landscape.x).toBeGreaterThan(50)
  })

  it.each(formations)('puts the players of a half where they stand on the whole pitch, for %s', (formation) => {
    ;[true, false].forEach((ours) => {
      const whole = pitchSpots(formation, lineUpSize, ours) ?? []
      const half = pitchSpots(formation, lineUpSize, ours, true) ?? []

      expect(half).toHaveLength(lineUpSize)
      half.forEach((spot, index) => {
        const full = whole[index]!
        // sc Heerenveen has the bottom and left half, the opponent the top and right half.
        const portraitY = ours ? 50 + spot.portrait.y / 2 : spot.portrait.y / 2
        const landscapeX = ours ? spot.landscape.x / 2 : 50 + spot.landscape.x / 2

        // A percentage is rounded to a tenth, so doubling it may differ by that much.
        expect(Math.abs(portraitY - full.portrait.y)).toBeLessThanOrEqual(0.1)
        expect(Math.abs(landscapeX - full.landscape.x)).toBeLessThanOrEqual(0.1)
        expect(spot.portrait.x).toBe(full.portrait.x)
        expect(spot.landscape.y).toBe(full.landscape.y)
        expect(spot.share).toBe(full.share)
        expect(Math.abs(spot.landscapeShare / 2 - full.landscapeShare)).toBeLessThanOrEqual(0.1)
        expect(spot.portrait.y).toBeGreaterThanOrEqual(0)
        expect(spot.portrait.y).toBeLessThanOrEqual(100)
        expect(spot.landscape.x).toBeGreaterThanOrEqual(0)
        expect(spot.landscape.x).toBeLessThanOrEqual(100)
      })
    })
  })

  it('gives a row of five or more a little more room to the side', () => {
    const wide = pitchSpots('3-5-2', lineUpSize, true) ?? []
    const normal = pitchSpots('4-4-2', lineUpSize, true) ?? []

    // The outer players of the row of five stand further out than those of a row of four.
    expect(wide[4]?.portrait.x).toBeLessThan(normal[1]?.portrait.x ?? 0)
  })

  describe.each(formations)('%s', (formation) => {
    const sizes = [
      { height: portraitHeight, name: 'upright', playerSize: 32, spot: 'portrait' as const, width: portraitWidth },
      { height: 360, name: 'lying down', playerSize: 40, spot: 'landscape' as const, width: landscapeWidth },
    ]

    it.each(sizes)('keeps every player of both teams apart when $name', ({ height, playerSize, spot, width }) => {
      const boxes: Box[] = [true, false].flatMap((ours) =>
        (pitchSpots(formation, lineUpSize, ours) ?? []).map((one) => ({
          height: playerSize,
          left: (one[spot].x / 100) * width - playerSize / 2,
          top: (one[spot].y / 100) * height - playerSize / 2,
          width: playerSize,
        })),
      )

      expect(boxes).toHaveLength(lineUpSize * 2)
      boxes.forEach((box, index) => {
        boxes.slice(index + 1).forEach((other) => {
          expect(overlap(box, other)).toBe(false)
        })
        // Inside the pitch.
        expect(box.left).toBeGreaterThanOrEqual(0)
        expect(box.left + box.width).toBeLessThanOrEqual(width)
        expect(box.top).toBeGreaterThanOrEqual(0)
        expect(box.top + box.height).toBeLessThanOrEqual(height)
      })
    })

    it.each([
      { name: 'on a phone of 320 pixels, one line of name', nameLines: 1, playerSize: 32, width: 253 },
      { name: 'on a phone of 390 pixels, two lines of name', nameLines: 2, playerSize: 36, width: 326 },
    ])('keeps the name of a player clear of the next row $name', ({ nameLines, playerSize, width }) => {
      const rows = parseFormation(formation) ?? []

      // With a row of five, or five rows, the names are left out on a phone.
      if (isCrowdedFormation(rows)) {
        return
      }

      const height = (width * 11) / 5
      const ys = [...new Set((pitchSpots(formation, lineUpSize, true) ?? []).map((one) => one.portrait.y))]
      const gaps = ys.slice(0, -1).map((y, index) => Math.abs(y - (ys[index + 1] ?? y)) * (height / 100))
      // The disc, a little room, and the lines of the name (12 px, line height 1.1).
      const needed = playerSize + 3 + nameLines * 13.2

      gaps.forEach((gap) => {
        expect(gap).toBeGreaterThanOrEqual(needed - 1)
      })
    })

    it('lets the names of one row stand next to each other without touching', () => {
      const spots = pitchSpots(formation, lineUpSize, true) ?? []
      const rows = new Map<number, Box[]>()

      spots.forEach((one) => {
        const row = rows.get(one.portrait.y) ?? []
        row.push({
          height: nameHeight,
          left: (one.portrait.x / 100) * portraitWidth - ((one.share / 100) * portraitWidth) / 2,
          top: 0,
          width: (one.share / 100) * portraitWidth,
        })
        rows.set(one.portrait.y, row)
      })

      rows.forEach((row) => {
        row.forEach((box, index) => {
          row.slice(index + 1).forEach((other) => {
            expect(overlap(box, other)).toBe(false)
          })
        })
      })
    })
  })
})
