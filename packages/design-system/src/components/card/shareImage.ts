/* eslint-disable baseline-js/use-baseline -- sharing files is not Baseline, so we download */

/** The time zone of the club, so a moment near midnight is on the day the visitor sees. */
const timeZone = 'Europe/Amsterdam'

const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone, year: 'numeric' })

const isoDayFormat = new Intl.DateTimeFormat('en-CA', { day: '2-digit', month: '2-digit', timeZone, year: 'numeric' })

/** What became of the image: it was shared, it was downloaded, or the visitor cancelled. */
export type ImageDelivery = 'cancelled' | 'downloaded' | 'shared'

/** The day as the strip under the card says it, such as `28 oktober 2026`. */
export const imageDay = (date: Date) => dayFormat.format(date)

/** The name of the file: `sc-heerenveen-`, the title in small letters with hyphens, the day. */
export const imageFileName = (title: string, date: Date) => {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const day = isoDayFormat.format(date)

  return ['sc-heerenveen', slug, day].filter((part) => part !== '').join('-') + '.png'
}

/** The name of the button: what it does, and for which card. */
export const imageButtonName = (title: string) => `Maak een afbeelding van ${title}`

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

const download = (file: File) => {
  const address = URL.createObjectURL(file)
  const link = document.createElement('a')

  link.download = file.name
  link.href = address
  document.body.append(link)
  link.click()
  link.remove()
  // The browser has started the download by the end of the click.
  setTimeout(() => URL.revokeObjectURL(address), 0)
}

/**
 * Gives the image to the visitor: the share sheet of the device where the browser can share
 * files, and a download where it can't. A visitor who closes the share sheet has cancelled,
 * which is no error. A browser that wants a fresh tap for the share sheet, because making the
 * image took too long, gets the download.
 */
export async function deliverImage(blob: Blob, { fileName, title }: { fileName: string; title: string }) {
  const file = new File([blob], fileName, { type: 'image/png' })

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })

      return 'shared' satisfies ImageDelivery
    } catch (error) {
      if (isAbort(error)) {
        return 'cancelled' satisfies ImageDelivery
      }
      if (!(error instanceof DOMException && error.name === 'NotAllowedError')) {
        throw error
      }
    }
  }

  download(file)

  return 'downloaded' satisfies ImageDelivery
}
