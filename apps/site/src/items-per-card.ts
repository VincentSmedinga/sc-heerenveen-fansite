/**
 * How many items a card with a list reads from the database: the discussions and the podcast
 * episodes. It is also how many episodes the card on /nieuws shows. The news card is the main
 * card of the page, so it has its own numbers.
 */
export const itemsPerCard = 5

/**
 * How many discussions and episodes the cards in the sidebar of the homepage show. They are
 * fewer than `itemsPerCard`, so that the sidebar is about as long as the main column next to it
 * (see the decision in docs/beslissingen.md for the heights).
 */
export const homeDiscussions = 2

export const homeEpisodes = 2

/** How many headlines the news card shows. Older news is for the archive at /nieuws. */
export const firstHeadlines = 10

/** How many clean sheets the card on the matches page starts with. */
export const firstCleanSheets = 10

/** How many more clean sheets the button of that card loads with each press. */
export const moreCleanSheets = 5

/** How many results /nieuws/zoeken starts with. */
export const firstResults = 10

/** How many more results the button of /nieuws/zoeken loads with each press. */
export const moreResults = 5
