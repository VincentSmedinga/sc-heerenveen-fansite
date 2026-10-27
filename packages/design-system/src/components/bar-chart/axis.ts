/** A number under the ground of a chart: the place it sits at (from 0) and when it is shown. */
export type AxisLabel = {
  /** Whether a narrow chart shows it too. A chart with room shows all of them. */
  narrow: boolean
  /** The place, counted from 0. */
  slot: number
}

/**
 * The places that get a number under the ground, for the number of places in the chart. The
 * first place and every tenth are on a narrow chart. A wide chart adds every fifth place and
 * the last place, unless the last is less than three places after the one before it, where the
 * two numbers would touch.
 */
export function axisLabels(slots: number): AxisLabel[] {
  const labels: AxisLabel[] = []

  for (let number = 1; number <= slots; number += 1) {
    const narrow = number === 1 || number % 10 === 0

    if (narrow || number % 5 === 0) labels.push({ narrow, slot: number - 1 })
  }

  const last = labels.at(-1)

  if (slots > 0 && last && slots - 1 - last.slot >= 3) labels.push({ narrow: false, slot: slots - 1 })

  return labels
}
