import type { Metadata } from 'next'

import { Button, Form, Heading, Input, Page, Strong, Text } from '@fansite/design-system'

import { closeMyAccount } from '#src/app/fans/mijn-account/actions'
import { closePaths, newConfirmation } from '#src/fans/close-account'
import { requireSupporter, supporterToken } from '#src/fans/require-supporter'
import { signUpPaths } from '#src/fans/sign-up'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Weet je het zeker?' }

// The confirmation of closing. The form carries the moment the page was made and a proof of the
// session (see close-account.ts), so the red button works only from a page of this session that
// is at most 10 minutes old, and not from another site or an old tab.
export default async function ConfirmCloseAccountPage() {
  const { screenName } = await requireSupporter({ blocked: 'allow', from: closePaths.form })
  const { issuedAt, proof } = newConfirmation((await supporterToken()) ?? '')

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Weet je het zeker?</Heading>
        <Text appearance="intro">
          Je account <Strong>{screenName}</Strong> gaat meteen weg. Dat kun je niet terugdraaien.
        </Text>
        <Form action={closeMyAccount}>
          <Input name="gemaakt" type="hidden" value={issuedAt} />
          <Input name="bewijs" type="hidden" value={proof} />
          <Button appearance="danger" type="submit">
            Ja, hef mijn account op
          </Button>
        </Form>
        <Form action={signUpPaths.account}>
          <Button appearance="soft" type="submit">
            Nee, terug
          </Button>
        </Form>
      </Page.Cell>
    </Page.Main>
  )
}
