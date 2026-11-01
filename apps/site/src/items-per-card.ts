/**
 * The sizes a list may have, in one place: 5, 10, 20 and 50. Every count in this file is one of
 * them, and a test says so (items-per-card.test.ts). Visitors don't choose a size: the code
 * does.
 */
export const listSizes = [5, 10, 20, 50] as const

/**
 * How many items a card with a list shows by default: the news, the discussions and the podcast
 * episodes on the homepage, and the podcast episodes on /nieuws. A card that comes later uses
 * it too, so the cards stay level. Cards of their own kind, such as the previous and the next
 * match or the table with three clubs, have their own numbers.
 */
export const itemsPerCard = listSizes[0]

/** How many headlines the news card on the homepage shows. Older news is for /nieuws. */
export const firstHeadlines = itemsPerCard

/** How many headlines a page of /nieuws shows. */
export const headlinesPerPage = listSizes[3]

/** How many clean sheets the card on the statistics page starts with. */
export const firstCleanSheets = listSizes[1]

/** How many more clean sheets the button of that card loads with each press. */
export const moreCleanSheets = listSizes[0]

/** How many results /nieuws/zoeken starts with. */
export const firstResults = listSizes[1]

/** How many more results the button of /nieuws/zoeken loads with each press. */
export const moreResults = listSizes[0]
