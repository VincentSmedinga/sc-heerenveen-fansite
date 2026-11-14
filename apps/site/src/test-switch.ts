/**
 * The HTML of the switch of the competition, as the page renders it, for a test: `address` is
 * the page without the choice, `current` the index of the marked choice, and `values` the
 * choices in the order of the switch as `[label, value]`, where `all` has an empty value.
 */
export function switchHtml(address: string, current: number, values: readonly (readonly [string, string])[]) {
  const links = values
    .map(([label, value], index) => {
      const href = value === '' ? address : `${address}?competitie=${value}`
      const marked = index === current ? ' aria-current="page"' : ''

      return `<a${marked} href="${href}"><span class="hf-segmented-label" data-label="${label}">${label}</span></a>`
    })
    .join('')

  return `<div aria-label="Welke wedstrijden" class="hf-segmented-control hf-segmented-compact" role="group" style="--hf-segmented-count:${values.length};--hf-segmented-index:${current}">${links}</div>`
}

/** The choices of a season with a league and a cup. */
export const leagueAndCup = [
  ['Alles', ''],
  ['Eredivisie', 'eredivisie'],
  ['Beker', 'beker'],
] as const
