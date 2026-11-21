import type { Metadata } from 'next'

import { Button, Card, Form, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { email as editorsEmail } from '#src/contact'
import { closePaths } from '#src/fans/close-account'
import { requireSupporter } from '#src/fans/require-supporter'
import { signUpPaths } from '#src/fans/sign-up'

import { BackToAccount } from '../BackToAccount'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Account opheffen' }

// The first step of closing the account: what goes and what stays. The red button only goes on
// to the confirmation; nothing is removed here. A blocked supporter can close the account too.
export default async function CloseAccountPage() {
  await requireSupporter({ blocked: 'allow', from: closePaths.form })

  return (
    <Page.Main>
      <Page.Cell>
        <BackToAccount />
        <Heading level={1}>Account opheffen</Heading>
        <Card aria-labelledby="weg-kop">
          <Heading id="weg-kop" level={2}>
            Dit gaat weg
          </Heading>
          <List>
            <List.Item>Je schermnaam en je e-mailadres</List.Item>
            <List.Item>Je naam in alle standen</List.Item>
            <List.Item>Je sessies, op alle apparaten</List.Item>
          </List>
        </Card>
        <Card aria-labelledby="blijft-kop">
          <Heading id="blijft-kop" level={2}>
            Dit blijft, zonder naam
          </Heading>
          <Text>
            Wat je in de spellen invulde, telt mee in de gemiddelden, zonder dat iemand ziet dat het van jou was. Daarna
            weten we ook zelf niet meer wat van jou was.
          </Text>
          <Text>
            Wil je die ook weg? <Link href={`mailto:${editorsEmail}`}>Mail de redactie</Link> voordat je opheft.
          </Text>
        </Card>
        {/* A form that only goes to the next page: the design system has no link as a
            button. */}
        <Form action={closePaths.confirm}>
          <Button appearance="danger" type="submit">
            Account opheffen
          </Button>
        </Form>
        <Text>
          <Link href={signUpPaths.account}>Annuleren</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
