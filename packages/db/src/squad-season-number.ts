/**
 * The how-manyth season of a player it is, in a season such as `2026/27`: the number of seasons
 * up to and including that one with the player in a squad list of ours, from any source. Later
 * seasons don't count, and seasons before and after a break count together.
 *
 * The number is given only when our lists prove it (issue 811): every season from the one
 * before the first of the player up to and including the shown one is complete, also a season
 * in between without the player. A list that is `bijna` can miss someone, and then the number
 * would be too low. Otherwise the result is undefined.
 */
export function squadSeasonNumber(
  seasons: Iterable<string>,
  completeSeasons: ReadonlySet<string>,
  season: string,
): number | undefined {
  const upToNow = [...new Set(seasons)].filter((each) => each <= season).sort()
  const first = upToNow[0]

  if (first === undefined || !upToNow.includes(season)) {
    return undefined
  }

  for (let year = startYear(first) - 1; year <= startYear(season); year += 1) {
    if (!completeSeasons.has(seasonFrom(year))) {
      return undefined
    }
  }

  return upToNow.length
}

/** The season that starts in the summer of a year: `1999/00` for 1999. */
function seasonFrom(year: number) {
  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`
}

function startYear(season: string) {
  return Number(season.slice(0, 4))
}
