import { BarList, Card, CountryName, Heading, Text } from '@fansite/design-system'

import type { GoalGroups } from './goal-groups'

import { type CompetitionChoice, competitionWords } from './competition'

/**
 * The card Doelpunten per land: the five countries with the most goals, each with the country
 * in words (`CountryName`) and the goals as text beside the bar. A line says that it is the
 * country of the scorer. It is soft, in the sidebar of the page with all seasons.
 */
export function GoalsPerCountryCard({ competition, groups }: { competition: CompetitionChoice; groups: GoalGroups }) {
  return (
    <Card aria-labelledby="doelpunten-per-land" surface="soft">
      <Heading anchor id="doelpunten-per-land" level={2}>
        Doelpunten per land
      </Heading>
      {groups.groups.length === 0 ? (
        <Text>{`We kennen nog geen doelpunten per land van ${competitionWords(competition)}.`}</Text>
      ) : (
        <>
          <BarList
            rows={groups.groups.map(({ goals, key }) => ({ label: <CountryName country={key} />, value: goals }))}
            wide
          />
          <Text appearance="meta">Het land van de doelpuntenmaker. Eigen doelpunten tellen niet mee.</Text>
          <Basis groups={groups} trait="het land" />
        </>
      )}
    </Card>
  )
}

/**
 * The card Doelpunten per linie: a bar per line (aanvallers, middenvelders, verdedigers,
 * doelmannen) with the goals as text beside it. A line without goals is not there. It is soft,
 * in the sidebar. Without a goal of a player whose line we know it is a sentence.
 */
export function GoalsPerLineCard({ competition, groups }: { competition: CompetitionChoice; groups: GoalGroups }) {
  return (
    <Card aria-labelledby="doelpunten-per-linie" surface="soft">
      <Heading anchor id="doelpunten-per-linie" level={2}>
        Doelpunten per linie
      </Heading>
      {groups.groups.length === 0 ? (
        <Text>{`We kennen nog geen doelpunten per linie van ${competitionWords(competition)}.`}</Text>
      ) : (
        <>
          <BarList rows={groups.groups.map(({ goals, name }) => ({ label: name, value: goals }))} wide />
          <Text appearance="meta">De linie van de doelpuntenmaker. Eigen doelpunten tellen niet mee.</Text>
          <Basis groups={groups} trait="de linie" />
        </>
      )}
    </Card>
  )
}

/**
 * The sentence under a card that says how many goals its bars rest on, when some goals have no
 * line or no country (or no person at all). It is left out when the bars rest on every goal.
 */
function Basis({ groups, trait }: { groups: GoalGroups; trait: string }) {
  const { counted, total } = groups

  return counted < total ? (
    <Text appearance="meta">{`Op basis van ${counted} van de ${total} doelpunten: van de rest kennen we ${trait} van de doelpuntenmaker niet.`}</Text>
  ) : null
}
