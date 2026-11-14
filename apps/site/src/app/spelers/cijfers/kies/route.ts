import { pickedSeasonResponse, playerFiguresPath } from '#src/season-page'

// Reads the seasons from the database on each request, like the page it sends visitors to.
export const dynamic = 'force-dynamic'

/**
 * What the button "Toon" of the season picker asks for,
 * `/spelers/cijfers/kies?seizoen=2025-26` (see pickedSeasonResponse).
 */
export const GET = (request: Request) => pickedSeasonResponse(request, playerFiguresPath, { keepCompetition: true })
