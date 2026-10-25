/**
 * The markup of a page without its icons, for a test about what is around them: the svg
 * elements go, and the groups that keep an icon with its word come apart again. A test about
 * the icons themselves looks at the markup as it is.
 */
export const withoutIcons = (html: string) =>
  html.replace(/<svg\b.*?<\/svg>/g, '').replace(/<span class="hf-icon-(?:head|tail)">(.*?)<\/span>/g, '$1')
