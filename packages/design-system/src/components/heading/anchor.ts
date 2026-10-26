/*
 * The rules for the id of a heading with an anchor. This module imports nothing, so a script
 * can use it too.
 */

/** The longest id of an anchor. A longer one is not short, and it is not nice to share. */
export const anchorIdMaxLength = 40

/**
 * Small letters and digits, in words joined by one hyphen: `cookies`, `wie-we-zijn`,
 * `versie-0-2-0`. No capitals, spaces, accents, dots or other characters, and no hyphen at the
 * start or the end or twice in a row.
 */
export const anchorIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Whether `id` follows the rules for the id of an anchor. */
export const isAnchorId = (id: string) => id.length <= anchorIdMaxLength && anchorIdPattern.test(id)

/**
 * Whether `id` is a possible old anchor. An old anchor is a promise that was kept before these
 * rules, so it may break them (`versie-0.2.0`), but it must still be an id that HTML allows:
 * not empty and without a space.
 */
export const isOldAnchorId = (id: string) => /^\S+$/.test(id)
