/*
 * The geometry of a donut chart, in the units of its drawing: a box of 320 by 300 with the
 * centre of the ring at the middle. The drawing scales with the width of the chart, and the
 * labels sit around it as text, which does not scale.
 */

export const drawing = { height: 300, width: 320 } as const

const centre = { x: drawing.width / 2, y: drawing.height / 2 }

/** The outer and the inner radius of the ring. */
export const ring = { inner: 52, outer: 82 } as const

/** The space between the ring and the place where a label starts. */
export const labelDistance = 12

/** The least distance in degrees between two labels, so they don't lie over each other. */
export const labelGap = 40

export type Slice = {
  /** The angle where the slice ends, in degrees clockwise from the top. */
  end: number
  /** The place of the slice in the list, from 0, also for the slices that are not drawn. */
  index: number
  /** The angle in the middle of the slice. */
  middle: number
  /** The angle where the slice starts. */
  start: number
  value: number
}

/** The point at this angle (degrees clockwise from the top) and distance from the centre. */
export function pointAt(angle: number, distance: number) {
  const radians = (angle * Math.PI) / 180

  return { x: centre.x + distance * Math.sin(radians), y: centre.y - distance * Math.cos(radians) }
}

/**
 * The slices of the values, clockwise from the top in the order they are given, each as wide as
 * its share of the total. A value of zero or less has no slice. Without a value above zero
 * there are none.
 */
export function slicesOf(values: readonly number[]): Slice[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0)
  let start = 0

  return values.flatMap((value, index) => {
    if (value <= 0) {
      return []
    }

    const end = start + (value / total) * 360
    const slice = { end, index, middle: (start + end) / 2, start, value }

    start = end

    return [slice]
  })
}

const round = (value: number) => Math.round(value * 100) / 100

const at = (angle: number, distance: number) => {
  const { x, y } = pointAt(angle, distance)

  return `${round(x)} ${round(y)}`
}

/**
 * The outline of a slice of the ring. One slice that fills the whole ring can't be an arc from
 * a point to itself, so it is two rings, drawn with the even-odd rule.
 */
export function slicePath({ end, start }: Pick<Slice, 'end' | 'start'>): string {
  const { inner, outer } = ring

  if (end - start >= 359.99) {
    return [
      `M ${at(0, outer)} A ${outer} ${outer} 0 1 1 ${at(180, outer)} A ${outer} ${outer} 0 1 1 ${at(0, outer)} Z`,
      `M ${at(0, inner)} A ${inner} ${inner} 0 1 0 ${at(180, inner)} A ${inner} ${inner} 0 1 0 ${at(0, inner)} Z`,
    ].join(' ')
  }

  const large = end - start > 180 ? 1 : 0

  return [
    `M ${at(start, outer)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${at(end, outer)}`,
    `L ${at(end, inner)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${at(start, inner)}`,
    'Z',
  ].join(' ')
}

/**
 * Moves angles apart until each is at least `gap` degrees from the next, also from the last to
 * the first around the circle. The angles come in clockwise order, and keep it. Angles that are
 * far enough apart stay where they are. When they can't all fit, they come back as they were.
 */
export function spreadAngles(angles: readonly number[], gap: number): number[] {
  const result = [...angles]
  const count = result.length

  if (count < 2 || count * gap > 360) {
    return result
  }

  for (let pass = 0; pass < 200; pass += 1) {
    let moved = false

    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count
      const distance = next === 0 ? result[0]! + 360 - result[index]! : result[next]! - result[index]!

      if (distance < gap - 1e-9) {
        const push = (gap - distance) / 2

        result[index] = result[index]! - push
        result[next] = result[next]! + push
        moved = true
      }
    }

    if (!moved) {
      break
    }
  }

  return result
}
