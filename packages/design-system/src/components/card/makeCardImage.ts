/**
 * Draws the stage (the card and the strip under it) as a PNG at twice the size, in the browser.
 * The library loads here, at the first click, so no page carries it until a visitor asks for an
 * image. It copies the styles the browser works out for each element into an SVG image, and
 * puts the fonts of the site in as data. Both stay in the page: the image is a `data:` address,
 * which the content security policy allows for images, and nothing goes to a server.
 */
export async function makeCardImage(stage: HTMLElement) {
  const { domToBlob } = await import('modern-screenshot')

  // The letters are drawn with the fonts of the site, so wait until the browser has them.
  await document.fonts.ready

  // No web worker: it would start from a `blob:` address, which the policy does not allow.
  const blob = await domToBlob(stage, { scale: 2, workerNumber: 0 })

  if (blob === null) {
    throw new Error('The browser could not draw the image.')
  }

  return blob
}
