import { Card, DataTable, Heading, Tag, Text } from '@fansite/design-system'

import { minimumMatches, minimumRatings, oldSourceLine, type PlayerRatings } from './player-ratings'

/** The id of the heading of the card, which the bar "Op deze pagina" links to. */
export const playerRatingsCardId = 'cijfers-van-supporters'

/** The dash a figure that we do not have shows: a figure we do not have is never a nought. */
const dash = '–'

/**
 * The card "Cijfers van supporters" on the page of a player (issue 1466): the table Per
 * seizoen, the table De laatste wedstrijden, a legend and, for numbers of the old fansite, the
 * source. The page of a match is linked where the address is known. The card has the
 * watermark of the Uitblinker (see `Card`).
 */
export function PlayerRatingsCard({
  matchHref,
  name,
  ratings,
}: {
  /** The address of the page of a match, or `undefined` when it has none. */
  matchHref: (match: PlayerRatings['last'][number]) => string | undefined
  name: string
  ratings: PlayerRatings
}) {
  const labels = new Set<string>()

  return (
    <Card aria-labelledby={playerRatingsCardId} game="uitblinker">
      <Heading id={playerRatingsCardId} level={2}>
        Cijfers van supporters
      </Heading>
      <Heading level={3}>Per seizoen</Heading>
      <DataTable
        caption={`De cijfers die supporters ${name} per seizoen gaven, het nieuwste seizoen eerst`}
        columns={[
          'Seizoen',
          { abbreviation: 'W', name: 'Wedstrijden met cijfers' },
          { abbreviation: 'C', name: 'Aantal cijfers' },
          { abbreviation: 'Gem', key: true, name: 'Gemiddeld cijfer' },
        ]}
        rows={ratings.seasons.map(({ average, count, matches, season }) => ({
          cells: [matches ?? dash, count ?? dash, average],
          header: season,
        }))}
        // The seasons stand in their own order, the newest first.
        sortable={false}
      />
      {ratings.last.length === 0 ? null : (
        <>
          <Heading level={3}>De laatste wedstrijden</Heading>
          <DataTable
            appearance="text"
            caption={`De laatste wedstrijden waarin ${name} een cijfer van supporters kreeg, de nieuwste eerst`}
            columns={[
              'Wedstrijd',
              { abbreviation: 'Gem', name: 'Gemiddeld cijfer' },
              { fold: true, name: 'Uitblinker' },
            ]}
            rows={ratings.last.map((match) => {
              // A header must be unique: the same match text twice gets its round.
              const header = labels.has(match.label) ? `${match.label} (${match.round})` : match.label
              const href = matchHref(match)

              labels.add(match.label)

              return {
                cells: [match.average, match.winner ? <Tag tone="highlight">Uitblinker</Tag> : ''],
                header,
                ...(href === undefined ? {} : { href }),
              }
            })}
            // The matches stand in the order of the day, the newest first.
            sortable={false}
          />
        </>
      )}
      <Text appearance="meta">
        {`W: wedstrijden met ${minimumRatings} cijfers of meer. C: aantal cijfers. Gem: gemiddelde van alle cijfers. Een seizoen staat er vanaf ${minimumMatches} wedstrijden.`}
        {ratings.seasonOnly ? ` Een streepje: van dat seizoen is alleen het seizoencijfer bekend.` : ''}
      </Text>
      {ratings.oldSource ? <Text appearance="meta">{oldSourceLine}</Text> : null}
    </Card>
  )
}
