'use client'

import { Button, Form, Notice, Switch, Text } from '@fansite/design-system'
import { useActionState, useSyncExternalStore } from 'react'

import { accountFields, rankingsMessage, type RankingsState } from '#src/fans/account-form'

import { saveRankings } from './actions'

const hintId = 'in-de-standen-uitleg'
const subscribeNothing = () => () => undefined

// The switch "Naam in de standen" on Mijn account. With JavaScript it saves the choice as soon
// as it changes, and a notice that is in the page from the start says what was saved, so a
// screen reader hears it. Without JavaScript the form is a plain POST with a button to save.
export function RankingsSwitch({ on }: { on: boolean }) {
  const [state, action] = useActionState<RankingsState, FormData>(saveRankings, { on })
  // False on the server and in the HTML, true once the page runs JavaScript.
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )

  return (
    <Form action={action}>
      <Switch
        aria-describedby={hintId}
        defaultChecked={state.on}
        id={accountFields.inRankings}
        label="Naam in de standen"
        name={accountFields.inRankings}
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit()
        }}
        value="aan"
      />
      <Text appearance="meta" id={hintId}>
        Uit: je speelt mee, maar je naam staat niet in de standen.
      </Text>
      {hydrated ? null : (
        <Button appearance="soft" type="submit">
          Opslaan
          <Text as="span" className="hf-visually-hidden">
            {' naam in de standen'}
          </Text>
        </Button>
      )}
      <Notice>{state.saved === true ? rankingsMessage(state.on) : null}</Notice>
    </Form>
  )
}
