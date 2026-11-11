/**
 * The address of the page of a player, from the `slug` of his person (`persons.slug`). Every
 * link to a page of a player is made here, so none can point to an old address.
 */
export const playerAddress = (slug: string) => `/spelers/${slug}`

/** The address of a player's page, or nothing for a person who has none (`slug` is null). */
export const playerHref = (slug: null | string | undefined) =>
  slug === null || slug === undefined ? undefined : playerAddress(slug)
