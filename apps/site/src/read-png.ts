import { inflateSync } from 'node:zlib'

/** The colour of a pixel as a hex value, such as `#04214e`. */
export function hexOf({ blue, green, red }: { blue: number; green: number; red: number }) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Reads a PNG of 8 bits per channel, in RGB or RGBA and without interlacing, which is what
 * Chromium writes. The tests of the icons use it to look at sizes and at single pixels, so the
 * site needs no image library for that.
 */
export function readPng(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes)

  if (!buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error('Not a PNG.')
  }

  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  const [bitDepth, colourType, , , interlace] = buffer.subarray(24, 29)
  const channels = colourType === 6 ? 4 : colourType === 2 ? 3 : 0

  if (bitDepth !== 8 || channels === 0 || interlace !== 0) {
    throw new Error('Only PNGs of 8 bits, in RGB or RGBA, without interlacing.')
  }

  const chunks: Buffer[] = []

  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset)

    if (buffer.toString('latin1', offset + 4, offset + 8) === 'IDAT') {
      chunks.push(buffer.subarray(offset + 8, offset + 8 + length))
    }

    offset += 12 + length
  }

  const raw = inflateSync(Buffer.concat(chunks))
  const stride = width * channels
  const pixels = Buffer.alloc(height * stride)

  // Each row starts with a filter type; undo it with the bytes to the left, above and above
  // left.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]

    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x]!
      const left = x >= channels ? pixels[y * stride + x - channels]! : 0
      const up = y > 0 ? pixels[(y - 1) * stride + x]! : 0
      const upLeft = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels]! : 0
      const paeth = () => {
        const estimate = left + up - upLeft
        const [distanceLeft, distanceUp, distanceUpLeft] = [left, up, upLeft].map((byte) => Math.abs(estimate - byte))

        return distanceLeft! <= distanceUp! && distanceLeft! <= distanceUpLeft!
          ? left
          : distanceUp! <= distanceUpLeft!
            ? up
            : upLeft
      }
      const predictor = [0, left, up, (left + up) >> 1, paeth()][filter!]

      if (predictor === undefined) {
        throw new Error(`Unknown PNG filter ${filter}.`)
      }

      pixels[y * stride + x] = (value + predictor) & 0xff
    }
  }

  return {
    height,
    /** The colour of a pixel as red, green, blue and alpha (255 for a PNG without alpha). */
    pixel: (x: number, y: number) => {
      const start = y * stride + x * channels

      return {
        alpha: channels === 4 ? pixels[start + 3]! : 255,
        blue: pixels[start + 2]!,
        green: pixels[start + 1]!,
        red: pixels[start]!,
      }
    },
    width,
  }
}
