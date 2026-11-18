import type { PublicGroupStandingsRow } from '@fansite/db/queries'

import { Heading, StandingsTable, WikipediaCredit } from '@fansite/design-system'

import { formatReadAt, wikipediaUrl } from './match-format'

/**
 * The table of the group stage of a European competition (#1405), under the matches of that
 * competition on the card: a heading with the group, the table with sc Heerenveen marked, and
 * the credit of the page of Wikipedia it was read from. `rows` are the rows of one competition
 * in one season, as `listGroupStandings` gives them; without a row the card shows nothing, so a
 * competition without a group table stays as it was.
 */
export function GroupStageTable({
  headingLevel = 3,
  rows,
  season,
}: {
  headingLevel?: 3 | 4
  rows: readonly PublicGroupStandingsRow[]
  season: string
}) {
  const [first] = rows

  if (first === undefined) {
    return null
  }

  const readAt = new Date(Math.max(...rows.map((row) => row.readAt.getTime())))

  return (
    <>
      <Heading level={headingLevel}>{`Tabel van ${first.groupName.toLowerCase()}`}</Heading>
      <StandingsTable
        caption={`Tabel van ${first.groupName.toLowerCase()} in de ${first.competition} van ${season}`}
        rows={rows.map((row) => ({
          club: row.club,
          played: row.played,
          points: row.points,
          position: row.position,
        }))}
      />
      <WikipediaCredit
        data="tabellen"
        pages={[{ href: wikipediaUrl(first.sourcePage, first.language), name: first.sourcePage }]}
        readAt={formatReadAt(readAt)}
        readAtDateTime={readAt.toISOString()}
      />
    </>
  )
}
