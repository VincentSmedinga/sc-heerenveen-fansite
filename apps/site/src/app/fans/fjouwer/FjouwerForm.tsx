'use client'

import {
  Button,
  ErrorSummary,
  Form,
  Notice,
  PickList,
  PitchSketch,
  type PitchSketchLine,
  type PitchSketchPlayer,
  Text,
} from '@fansite/design-system'
import { useActionState, useEffect, useState } from 'react'

import {
  closedMessage,
  emptyFjouwerState,
  type FjouwerFormState,
  type FormPlayer,
  groupId,
  matchField,
  playerField,
  playerLine,
  savedMessage,
} from '#src/fans/fjouwer-form'
import {
  type FjouwerLine,
  fjouwerLines,
  lineWords,
  maxPerLine,
  maxUsesPerSeason,
  picksPerMatch,
} from '#src/fans/fjouwer-rules'

import { saveFjouwerAction } from './actions'

const instruction = `Kies ${picksPerMatch} spelers, hoogstens ${maxPerLine} per linie. Elke speler kun je ${maxUsesPerSeason} wedstrijden per seizoen kiezen.`

// The line of a player as the pitch names it.
const pitchLines: Record<FjouwerLine, PitchSketchLine> = {
  aanvaller: 'aanvaller',
  doelman: 'keeper',
  middenvelder: 'middenvelder',
  verdediger: 'verdediger',
}

// The form of the four: the pitch with the four, the list of players to tick and one button. It
// is a client component only to show what the server says and to count what is ticked: the form
// is a plain POST that works without JavaScript, and with JavaScript the page doesn't reload.
// The notice is in the page from the start, empty, so a screen reader announces it when it
// fills. After an error the focus goes to the summary, whose links bring it to the groups.
export function FjouwerForm({
  inheritedLine,
  matchId,
  noteForStruck,
  players,
  saved,
  startFour,
  struck,
}: {
  /** The line about an inherited four, in a notice, or nothing. */
  inheritedLine?: string | undefined
  matchId: number
  /** The text in the list of a player who does not count. */
  noteForStruck: string
  /** The squad in the order of the form. */
  players: readonly FormPlayer[]
  /** Whether the supporter saved a four for this match. */
  saved: boolean
  /** The ids of the four the supporter has now, in the order of the list. */
  startFour: readonly number[]
  /** The ids in the four who have their ten and do not count. */
  struck: readonly number[]
}) {
  const ticked = startFour.filter((id) => !struck.includes(id)).map(String)
  const [state, action] = useActionState<FjouwerFormState, FormData>(saveFjouwerAction, emptyFjouwerState(ticked))
  // What is ticked now, when it differs from what the last answer of the server says.
  const [edited, setEdited] = useState<undefined | { answer: FjouwerFormState; values: string[] }>()
  const live = edited?.answer === state ? edited.values : state.values
  const count = live.length
  const summaryId = `fjouwer-${matchId}-fouten`
  const formId = `fjouwer-${matchId}`
  const noticeId = `fjouwer-${matchId}-melding`
  const answered = state.saved !== undefined || state.failure !== undefined || hasErrors(state)
  const byId = new Map(players.map((player) => [String(player.id), player]))
  // Always the four the server knows, never what is ticked: after a save the action refreshes
  // the page, and after a refusal nothing has changed.
  const places = Array.from({ length: picksPerMatch }, (_, index): null | PitchSketchPlayer => {
    const id = startFour[index]
    const player = id === undefined ? undefined : byId.get(String(id))

    return player === undefined
      ? null
      : {
          line: pitchLines[player.line],
          name: player.name,
          note: struck.includes(player.id) ? noteForStruck : undefined,
          shirtNumber: player.shirtNumber,
          shortName: player.shortName,
        }
  })
  const summary = [
    ...fjouwerLines.flatMap((line) => {
      const messages = state.errors.lines[line]

      return messages === undefined ? [] : [{ id: groupId(line), message: messages.join(' ') }]
    }),
    ...state.errors.general.map((message) => ({ id: groupId('doelman'), message })),
  ]
  const hasFour = saved || state.saved !== undefined

  const read = (form: HTMLFormElement) => {
    setEdited({ answer: state, values: new FormData(form).getAll(playerField).map(String) })
  }

  useEffect(() => {
    if (summary.length > 0) {
      document.getElementById(summaryId)?.focus()
    } else if (state.failure !== undefined) {
      document.getElementById(noticeId)?.focus()
    }
    // Only a new answer of the server moves the focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const notice =
    state.saved === undefined
      ? state.failure === undefined
        ? undefined
        : closedMessage
      : savedMessage(state.saved.until)

  return (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={3} tabIndex={-1} title="Je keuze klopt nog niet" />
      <Notice id={noticeId} tabIndex={-1}>
        {notice}
      </Notice>
      {inheritedLine === undefined || answered ? null : <Notice>{inheritedLine}</Notice>}
      <PitchSketch label="Jouw vier" places={places} />
      <Text>{instruction}</Text>
      <Form
        action={action}
        id={formId}
        onChange={(event) => {
          read(event.currentTarget)
        }}
      >
        <PickList
          groups={fjouwerLines.map((line) => {
            const inLine = players.filter((player) => player.line === line)
            const chosen = inLine.filter((player) => live.includes(String(player.id))).length

            return {
              chosen,
              error: state.errors.lines[line]?.join(' '),
              id: groupId(line),
              legend: lineWords[line].legend,
              maximum: maxPerLine,
              name: playerField,
              options: inLine.map((player) => ({
                disabled: player.usesLeft === 0,
                label: player.name,
                line: playerLine(player.points, player.usesLeft),
                reason: player.usesLeft === 0 ? `Al ${maxUsesPerSeason} keer gekozen` : undefined,
                value: String(player.id),
              })),
              value: state.values,
            }
          })}
        />
        <Button name={matchField} type="submit" value={matchId}>
          {hasFour ? 'Wijziging opslaan' : 'Opslaan'}
        </Button>
        <Text appearance="meta">{`${count} van ${picksPerMatch} gekozen`}</Text>
      </Form>
    </>
  )
}

const hasErrors = (state: FjouwerFormState) =>
  state.errors.general.length > 0 || Object.keys(state.errors.lines).length > 0
