import { Card, DescriptionList, Heading } from '@fansite/design-system'

import type { SquadSummary } from './squad-summary'

import { DataLine } from './DataLine'

const oneDecimal = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

/**
 * The card "In het kort" on the page Spelers: how many players the card Selectie
 * shows, the average age, the youngest and the oldest, and the number of countries, as lines
 * with the name on the left and the figure on the right. It is a soft card at the top of the
 * side column. The lines with an age are there only in the current season and only when enough
 * players have an age; under the lines, one sentence says how many players the figures rest on
 * when some are missing. Only the worked-out figures come in: never a date of birth.
 */
export function SquadSummaryCard({ summary }: { summary: SquadSummary }) {
  const { ages, basis, countries } = summary

  return (
    <Card aria-labelledby="in-het-kort" surface="soft">
      <Heading id="in-het-kort" level={2}>
        In het kort
      </Heading>
      <DescriptionList aligned stacked>
        <DescriptionList.Item term="Spelers">{summary.players}</DescriptionList.Item>
        {ages === undefined ? null : (
          <>
            <DescriptionList.Item term="Gemiddelde leeftijd">
              {oneDecimal.format(ages.average)} jaar
            </DescriptionList.Item>
            <DescriptionList.Item term="Jongste">{ages.youngest} jaar</DescriptionList.Item>
            <DescriptionList.Item term="Oudste">{ages.oldest} jaar</DescriptionList.Item>
          </>
        )}
        {countries === undefined ? null : <DescriptionList.Item term="Landen">{countries}</DescriptionList.Item>}
      </DescriptionList>
      {basis === undefined ? null : <DataLine limits={[`${basis.known} van de ${basis.total} spelers`]} />}
    </Card>
  )
}
