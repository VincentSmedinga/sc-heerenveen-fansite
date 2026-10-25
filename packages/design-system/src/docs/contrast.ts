/** WCAG 2.2 contrast ratio between two colours. */

type Rgb = [number, number, number]

let canvas: CanvasRenderingContext2D | null | undefined

/**
 * Any CSS colour (hex, rgb(), oklch() and so on) as sRGB channels from 0 to 255, by painting it
 * on a canvas. Returns undefined for something that isn't a colour, and for a colour that isn't
 * fully opaque: a transparent background usually means a token couldn't be resolved, and its
 * contrast can't be measured.
 */
export const toRgb = (value: string): Rgb | undefined => {
  const colour = value.trim()
  if (!colour || !CSS.supports('color', colour)) return undefined

  // Temporary exception to the Baseline rule: the hint stops Chrome's console warning about
  // repeated readbacks. It has been newly available since 16 September 2024 and becomes widely
  // available on 16 March 2027. ESLint then reports this disable as unused. Then remove it.
  // eslint-disable-next-line baseline-js/use-baseline -- widely available from 16 March 2027
  canvas ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!canvas) return undefined

  canvas.clearRect(0, 0, 1, 1)
  canvas.fillStyle = colour
  canvas.fillRect(0, 0, 1, 1)
  const [red = 0, green = 0, blue = 0, alpha = 0] = canvas.getImageData(0, 0, 1, 1).data

  return alpha === 255 ? [red, green, blue] : undefined
}

/**
 * A colour that isn't opaque, such as a stripe, as the opaque colour it makes on the surface
 * below. The blend is worked out here, not by painting both on a canvas: a canvas blends in 8
 * bits, and its rounding moved a ratio by 0,03, which is all the margin some pairs have.
 */
export const flatten = (colour: string, under: string): string | undefined => {
  // The computed value of a translucent colour ends in its alpha:
  // `color(srgb 0.8 0.8 0.7 / 0.3)` or `rgba(1, 2, 3, 0.3)`.
  const [, alphaText = '1', percent = ''] =
    /\/\s*([\d.]+)(%?)\s*\)$/.exec(colour) ?? /^rgba\(.*,\s*([\d.]+)(%?)\s*\)$/.exec(colour) ?? []
  const alpha = Number(alphaText) / (percent ? 100 : 1)
  const opaque = colour.replace(/\s*\/\s*[\d.]+%?\s*\)$/, ')').replace(/^rgba\((.*),[^,]*\)$/, 'rgb($1)')
  const top = toRgb(opaque)
  const bottom = toRgb(under)

  if (!top || !bottom || Number.isNaN(alpha)) return undefined

  return `rgb(${top.map((channel, index) => Math.round(channel * alpha + (bottom[index] ?? 0) * (1 - alpha))).join(' ')})`
}

const linear = (channel: number) => {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const luminance = ([red, green, blue]: Rgb) => 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)

export const contrastRatio = (foreground: string, background: string): number | undefined => {
  const fg = toRgb(foreground)
  const bg = toRgb(background)

  if (!fg || !bg) return undefined

  const [lighter, darker] = [luminance(fg), luminance(bg)].sort((a, b) => b - a) as [number, number]

  return (lighter + 0.05) / (darker + 0.05)
}

/** A ratio in Dutch notation, such as 16,64:1. Two decimals, so 4,49 never reads as 4,5. */
export const formatRatio = (ratio: number | undefined) =>
  ratio === undefined
    ? 'onbekend'
    : `${(Math.floor(ratio * 100) / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}:1`
