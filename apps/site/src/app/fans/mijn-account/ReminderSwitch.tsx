'use client'

import { Button, Form, Switch, Text } from '@fansite/design-system'
import { useSyncExternalStore } from 'react'

import { accountFields } from '#src/fans/account-form'

import { saveReminder } from './actions'

const hintId = 'herinnering-uitleg'
const subscribeNothing = () => () => undefined

// The switch "Herinnering per e-mail" on Mijn account, with the same layout as "Naam in de
// standen". With JavaScript it saves the choice as soon as it changes. The action goes back to
// the page, where a notice at the top says what was saved. Without JavaScript the form is a
// plain POST with a button to save.
export function ReminderSwitch({ on }: { on: boolean }) {
  // False on the server and in the HTML, true once the page runs JavaScript.
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )

  return (
    <Form action={saveReminder}>
      <Switch
        aria-describedby={hintId}
        defaultChecked={on}
        id={accountFields.remindByEmail}
        label="Herinnering per e-mail"
        name={accountFields.remindByEmail}
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit()
        }}
        value="aan"
      />
      <Text appearance="meta" id={hintId}>
        Eén bericht de dag voor een wedstrijd, alleen als je dan nog niet hebt voorspeld. In het bericht staat een link
        om het uit te zetten.
      </Text>
      {hydrated ? null : (
        <Button appearance="soft" type="submit">
          Opslaan
          <Text as="span" className="hf-visually-hidden">
            {' herinnering'}
          </Text>
        </Button>
      )}
    </Form>
  )
}
