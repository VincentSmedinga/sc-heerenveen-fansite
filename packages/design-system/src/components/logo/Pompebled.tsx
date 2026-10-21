import type { SVGProps } from 'react'

/*
 * The pompeblêd: a water lily leaf from the Frisian flag, not a heart.
 *
 * Geometry after the official drawing of the flag by P.H. Wagemakers and Joh. Koopmans (12 March 1954),
 * as published on Wikimedia Commons (File:Pompebled.svg, public domain): circular and elliptical arcs,
 * tilted by 34.695 degrees. In the original the two large bottom arcs meet in a slight corner. We round
 * that off with a 10-unit arc that is tangent to both, so the leaf has no point.
 *
 * Coordinates are centred on the leaf's axis; after rotation the leaf spans about x −12 to 15 and y −15 to 12.
 */
export const pompebledPath =
  'M-3.489,11.129A16.143,16.143 0 0,1 -14,-4A7,8 0 0,1 -7,-12A6,8 0 0,1 -1,-5A1,1 0 1,0 1,-5' +
  'A6,8 0 0,1 7,-12A7,8 0 0,1 14,-4A16.143,16.143 0 0,1 3.489,11.129A10,10 0 0,1 -3.489,11.129Z'

export const pompebledRotation = 34.695

type PompebledProps = SVGProps<SVGPathElement> & {
  /** Where to place the leaf's centre, in the coordinates of the surrounding SVG. */
  x?: number
  y?: number
}

/** One leaf, to place inside an <svg>. */
export const Pompebled = ({ x = 0, y = 0, ...props }: PompebledProps) => (
  <path d={pompebledPath} transform={`translate(${x} ${y}) rotate(${pompebledRotation})`} {...props} />
)
