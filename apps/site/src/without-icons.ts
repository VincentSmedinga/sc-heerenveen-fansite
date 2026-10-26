/**
 * The markup of a page without its icons, for a test about what is around them: the svg
 * elements go, and the groups that keep an icon with its word come apart again. A test about
 * the icons themselves looks at the markup as it is.
 */
export const withoutIcons = (html: string) =>
  html
    .replace(/<svg\b.*?<\/svg>/g, '')
    .replace(/<span class="hf-icon-(?:head|tail)">(.*?)<\/span>/g, '$1')
    // The word joiner that keeps an icon behind small print with the text before it.
    .replaceAll('\u2060', '')

/**
 * The markup of a page without the links that the headings with an anchor are, for a test about
 * the other links and icons of the page: each heading keeps its text, its id and its class, and
 * loses the link and the chain icon. A test about the anchors themselves looks at the markup as
 * it is.
 */
export const withoutHeadingLinks = (html: string) =>
  html
    .replace(/<span class="hf-heading-target"><svg\b.*?<\/svg><\/span>/g, '')
    .replace(/<a class="hf-heading-link" href="#[^"]*">(.*?)<\/a>/g, (_, inner: string) => withoutIcons(inner))

/** The id and the text of each heading with an anchor, in the order of the page. */
export const headingAnchors = (html: string) =>
  [
    ...html.matchAll(
      /<h[2-4] [^>]*id="([^"]*)"[^>]*>(?:<span class="hf-heading-target">.*?<\/span>)?(?:<span class="hf-heading-alias"[^>]*><\/span>)*<a class="hf-heading-link" href="#\1">(.*?)<\/a><\/h[2-4]>/g,
    ),
  ].map(([, id, inner]) => [id, withoutIcons(inner ?? '')])
