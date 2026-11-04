import type { BarChartAxisLabel, BarChartBar } from '../bar-chart/BarChart'

import { type FormResult, pointsOf, toneOf } from '../form-chart/form'

/** The bars of the chart: a bar for each result, as high as its points, nothing for a gap. */
export const barsOf = (results: readonly (FormResult | null)[]): (BarChartBar | null)[] =>
  results.map((result) => (result === null ? null : { tone: toneOf(result), value: pointsOf(result) }))

/** The year a place belongs to: `perYear` places make a year, from the year of the first. */
export const yearOfPlace = (place: number, firstYear: number, perYear: number) =>
  firstYear + Math.floor(place / perYear)

/** A year as its last two digits: 1990 is `90`, 2000 is `00` and 2005 is `05`. */
export const shortYear = (year: number) => String(year % 100).padStart(2, '0')

/**
 * The labels under the places: every `every` years, those whose year is a multiple of `every`
 * (1990, 1995, 2000, ...), in the middle under the places of that year. A year before the
 * first place and a year after the last one has no label.
 */
export function yearLabels(places: number, firstYear: number, perYear: number, every: number): BarChartAxisLabel[] {
  const years = Math.ceil(places / perYear)
  const labels: BarChartAxisLabel[] = []

  for (let index = 0; index < years; index += 1) {
    const year = firstYear + index

    if (year % every === 0) labels.push({ at: (index + 0.5) * perYear, text: shortYear(year) })
  }

  return labels
}
