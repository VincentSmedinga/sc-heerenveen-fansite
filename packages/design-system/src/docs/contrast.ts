/** WCAG 2.2 contrast ratio between two colours. */

type Rgb = [number, number, number]

let canvas: CanvasRenderingContext2D | null | undefined

/**
 * Any CSS colour (hex, rgb(), oklch() and so on) as sRGB channels from 0 to 255, by painting it on a canvas.
 * Returns undefined for something that isn't a colour, and for a colour that isn't fully opaque: a transparent
 * background usually means a token couldn't be resolved, and its contrast can't be measured.
 */
export const toRgb = (value: string): Rgb | undefined => {
  const colour = value.trim()
  if (!colour || !CSS.supports('color', colour)) return undefined

  canvas ??= document.createElement('canvas').getContext('2d')
  if (!canvas) return undefined

  canvas.clearRect(0, 0, 1, 1)
  canvas.fillStyle = colour
  canvas.fillRect(0, 0, 1, 1)
  const [red = 0, green = 0, blue = 0, alpha = 0] = canvas.getImageData(0, 0, 1, 1).data

  return alpha === 255 ? [red, green, blue] : undefined
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
