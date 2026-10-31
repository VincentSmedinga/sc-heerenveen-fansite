import type { ClubFullName } from '@fansite/db/clubs'

/**
 * The clubs that Wikipedia writes under more than one name, each with its full name and its
 * other spellings. The importer looks a name up here first: `Excelsior` is the club `Excelsior
 * Rotterdam`, with or without an article, and the club has one name and one address on the
 * site. A name that is not here works as it does for every club, so `Excelsior Maassluis`, an
 * amateur club in the cup, stays another club.
 *
 * The full name is what the site shows and where the slug comes from. A spelling is only a
 * spelling when it is the same club: add a club only after you checked that it is one (a
 * different article on Wikipedia is a different club).
 *
 * `relevance-terms.ts` has its own list of club names for the filter of the headlines. It has
 * another purpose and stays as it is.
 */
export const clubFullNames: readonly ClubFullName[] = [
  { aliases: ['Excelsior', 'SBV Excelsior'], name: 'Excelsior Rotterdam' },
]
