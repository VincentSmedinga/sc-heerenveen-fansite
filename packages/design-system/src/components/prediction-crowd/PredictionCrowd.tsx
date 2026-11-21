import { BarList } from '../bar-list/BarList'
import { Heading, type HeadingLevel } from '../heading/Heading'
import { type KeyFigure, KeyFigures } from '../key-figures/KeyFigures'
import { OutcomeBar } from '../outcome-bar/OutcomeBar'
import { Text } from '../text/Text'

/** How supporters predicted the outcome of the match, for sc Heerenveen. */
export type PredictionCrowdOutcomes = {
  /** The outcome that was played, when the match is over. It is marked in words. */
  actual?: 'draw' | 'loss' | 'win' | undefined
  draws: number
  losses: number
  wins: number
}

export type PredictionCrowdProps = {
  /** The line that says how many supporters predicted, and what comes next. */
  children: string
  /** Figures about the match that is over, such as the average prediction. Two to four. */
  figures?: readonly KeyFigure[] | undefined
  /** The level of the heading above the list of scores. */
  headingLevel?: Exclude<HeadingLevel, 1>
  /** The share of win, draw and loss, from the kick-off. */
  outcomes?: PredictionCrowdOutcomes | undefined
  /** The most predicted final scores, the most predicted first, from the kick-off. */
  scores?: readonly PredictionCrowdScore[] | undefined
}

/** One row of the most predicted final scores. */
export type PredictionCrowdScore = {
  /** Whether this is the score that was played. It is marked in words. */
  actual?: boolean | undefined
  /** How many supporters predicted it. */
  count: number
  /** The score as it is shown, home first, such as `2–1`, or `anders`. */
  label: string
}

const outcomeWords = { draw: 'Gelijk', loss: 'Verlies', win: 'Winst' } as const

/**
 * What a group of supporters predicted for one match, without a name: a line with how many
 * predicted, and from the kick-off the outcome bar with its words and the list of the most
 * predicted scores. After the match the key figures stand on top. The colours are never the
 * only sign: the outcome and the score that were played carry the word "uitslag". It has no
 * card or heading of its own, so the page puts it in the card of the game.
 */
export const PredictionCrowd = ({ children, figures, headingLevel = 3, outcomes, scores }: PredictionCrowdProps) => {
  const legend =
    outcomes === undefined
      ? undefined
      : (['win', 'draw', 'loss'] as const)
          .map((key) => {
            const count = { draw: outcomes.draws, loss: outcomes.losses, win: outcomes.wins }[key]

            return `${outcomeWords[key]} ${count}${outcomes.actual === key ? ' (uitslag)' : ''}`
          })
          .join(' · ')

  return (
    <>
      {figures === undefined ? null : <KeyFigures figures={figures} />}
      <Text>{children}</Text>
      {outcomes === undefined ? null : (
        <>
          <OutcomeBar draws={outcomes.draws} losses={outcomes.losses} wins={outcomes.wins} />
          <Text>{legend}</Text>
        </>
      )}
      {scores === undefined || scores.length === 0 ? null : (
        <>
          <Heading appearance={3} level={headingLevel}>
            Meest voorspelde eindstanden
          </Heading>
          <BarList
            aria-label="Meest voorspelde eindstanden, met hoe vaak"
            rows={scores.map(({ actual, count, label }) => ({
              label: actual === true ? `${label} (uitslag)` : label,
              value: count,
            }))}
          />
        </>
      )}
    </>
  )
}
