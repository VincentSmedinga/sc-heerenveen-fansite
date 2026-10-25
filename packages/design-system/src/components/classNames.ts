/**
 * Joins class names and leaves out the empty ones. Gives undefined when nothing is left, so no empty `class` ends up in
 * the HTML.
 */
export const classNames = (...names: (false | string | undefined)[]): string | undefined =>
  names.filter(Boolean).join(' ') || undefined
