/** What a line through the values can look like: smooth, or with straight stretches. */
export type TrendCurve = 'smooth' | 'straight'

/**
 * The average of each value and the ones before it, over a window of `span` values. The first
 * `span - 1` places have no average yet, and neither has a place whose window holds a gap
 * (`null`), so a gap stays a gap in the line.
 */
export function movingAverage(values: readonly (null | number)[], span: number): (null | number)[] {
  const size = Math.max(1, Math.floor(span))

  return values.map((_, index) => {
    if (index < size - 1) return null

    const part = values.slice(index - size + 1, index + 1)

    return part.every((value) => value !== null) ? part.reduce<number>((sum, value) => sum + value, 0) / size : null
  })
}

/** The height of a value in the drawing: 0 at the top of the chart and 100 on the ground. */
const heightOf = (value: number, max: number) => 100 - (Math.min(max, Math.max(0, value)) / max) * 100

const round = (number: number) => Math.round(number * 1000) / 1000

/**
 * The `d` of an SVG path through the values, one per place. The drawing has one unit of width
 * for each place, so the point of a place is in the middle of it, and a height from 0 (the top)
 * to 100 (the ground): a value of 0 is on the ground and `max` at the top. The curve is smooth
 * and never goes below 0 or above `max`, and it stays flat between two equal values. A gap
 * (`null`) ends the line and the next value starts a new one. A single value between two gaps
 * has no line.
 */
export function monotonePath(values: readonly (null | number)[], max: number, curve: TrendCurve = 'smooth'): string {
  const paths: string[] = []
  let run: number[] = []
  let start = 0

  const end = () => {
    if (run.length > 1) paths.push(runPath(run, start, curve))
    run = []
  }

  values.forEach((value, index) => {
    if (value === null) {
      end()
      return
    }
    if (run.length === 0) start = index
    run.push(heightOf(value, max))
  })
  end()

  return paths.join(' ')
}

/** The path of one run of points, one place apart, from the place `start`. */
function runPath(heights: readonly number[], start: number, curve: TrendCurve): string {
  const [first, ...rest] = heights.map((height, index) => ({ x: start + index + 0.5, y: height }))

  if (!first) return ''

  const slopes = slopesOf(heights)
  const parts = [`M${round(first.x)} ${round(first.y)}`]
  let before = first

  rest.forEach((point, index) => {
    if (curve === 'straight') {
      parts.push(`L${round(point.x)} ${round(point.y)}`)
    } else {
      // The control points sit a third of the way along, at the height the slope gives. The
      // slopes keep the curve between its two values, so it never leaves 0 to 100.
      const out = before.y + slopes[index]! / 3
      const into = point.y - slopes[index + 1]! / 3
      parts.push(
        `C${round(before.x + 1 / 3)} ${round(out)} ${round(point.x - 1 / 3)} ${round(into)} ${round(point.x)} ${round(point.y)}`,
      )
    }
    before = point
  })

  return parts.join(' ')
}

/**
 * The slope at each point of a run, for a curve that never goes past its values. A point where
 * the neighbours go up and then down (or where one stretch is flat) has slope 0, so the curve
 * levels out there. Elsewhere the slope is the harmonic mean of the slopes of the two stretches
 * (Fritsch and Butland), and the ends take the slope of their only stretch. The points are one
 * apart, so a slope is just the difference of two heights.
 */
function slopesOf(heights: readonly number[]): number[] {
  const chords = heights.slice(1).map((height, index) => height - heights[index]!)

  return heights.map((_, index) => {
    const before = chords[index - 1]
    const after = chords[index]

    if (before === undefined) return after ?? 0
    if (after === undefined) return before

    return before * after <= 0 ? 0 : (2 * before * after) / (before + after)
  })
}
