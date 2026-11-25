import { Card, DescriptionList, Heading, Text } from '@fansite/design-system'

import { DataLine, incompleteMatches } from './DataLine'
import { penaltiesCard } from './matchShortcuts'

/**
 * The card "Strafschoppen" of Cijfers: how many penalties sc Heerenveen scored and how many
 * the opponents scored against us, in the choice of competition and in the season or in all
 * seasons. It is built as the card Uitersten: a stacked `DescriptionList` with a pair per
 * number, the name above the value. We only know the penalties that were scored, so a line says
 * so, and another how many of the played matches it is based on. A penalty shoot-out is not a
 * penalty of the match and is not counted. Without a penalty there is no list, but the card
 * stays and says "Geen strafschoppen" (#1215).
 */
export function PenaltiesCard({
  against,
  for: scored,
  known,
  level = 2,
  played,
}: {
  against: number
  for: number
  known: number
  level?: 2 | 3
  played: number
}) {
  return (
    <Card aria-labelledby={penaltiesCard.id} surface="soft">
      <Heading anchor id={penaltiesCard.id} level={level}>
        {penaltiesCard.name}
      </Heading>
      {scored + against === 0 ? (
        <Text>Geen strafschoppen</Text>
      ) : (
        <DescriptionList stacked>
          <DescriptionList.Item term="Voor ons, benut">
            <Text>{scored}</Text>
          </DescriptionList.Item>
          <DescriptionList.Item term="Tegen ons, benut">
            <Text>{against}</Text>
          </DescriptionList.Item>
        </DescriptionList>
      )}
      <Text appearance="meta">We kennen alleen de benutte strafschoppen.</Text>
      <DataLine limits={[incompleteMatches(known, played)]} />
    </Card>
  )
}
