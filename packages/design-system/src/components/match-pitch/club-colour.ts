// The colour of a club on a disc (#1677). It comes from outside the design system, so only a
// colour that is checked gets on the page.

const form = /^#[0-9a-f]{6}$/iu

/** The colour when it is `#rrggbb`, and none for anything else. */
export const checkedClubColour = (colour: string | undefined) =>
  colour !== undefined && form.test(colour) ? colour : undefined

/**
 * The colour of the figure on a disc of `colour`: black or white, the one with the most
 * contrast. One of the two always has at least 4.5:1.
 */
export function figureColourOn(colour: string): '#000000' | '#ffffff' {
  const light = luminance(colour)

  return (light + 0.05) / 0.05 >= 1.05 / (light + 0.05) ? '#000000' : '#ffffff'
}

/** The share of one channel in the luminance of a colour, as WCAG 2.2 counts it. */
const channel = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)

/** The relative luminance of `#rrggbb`. */
function luminance(colour: string) {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((at) => channel(parseInt(colour.slice(at, at + 2), 16) / 255))

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}
