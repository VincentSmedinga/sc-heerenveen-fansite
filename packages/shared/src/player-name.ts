/**
 * A name as a page shows it when it stands in front: with a capital, as in Dutch (`Van
 * Bergen`, `Da Silva`). Use it for a surname with no given name or initial before it, and for
 * a whole name, which then starts with its given name or with that surname. A name that starts
 * with an apostrophe (`’t Hart`) stays as it is. This is the one place with the rule (#1714);
 * the stored name never changes.
 */
export const capitaliseName = (name: string): string => `${name.charAt(0).toLocaleUpperCase('nl')}${name.slice(1)}`
