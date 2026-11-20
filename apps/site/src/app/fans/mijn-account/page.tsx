import type { Metadata } from 'next'

import { Button, Card, DescriptionList, Form, Heading, Notice, Page, Text } from '@fansite/design-system'

import { requireSupporter } from '#src/fans/require-supporter'
import { signUpPaths } from '#src/fans/sign-up'

import { logOut, logOutEverywhere } from './actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Mijn account' }

// The account of the supporter who is logged in. For now it shows the screen name and the
// address, and the card to log out; changing and closing the account come later. A blocked
// supporter sees it too.
export default async function MyAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supporter = await requireSupporter({ blocked: 'allow', from: signUpPaths.account })
  const { welkom } = await searchParams

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Mijn account</Heading>
        {welkom === '1' ? (
          <Notice>Welkom, {supporter.screenName}. Je account is klaar en je blijft op dit apparaat ingelogd.</Notice>
        ) : null}
        <Card aria-labelledby="gegevens-kop">
          <Heading id="gegevens-kop" level={2}>
            Je account
          </Heading>
          <DescriptionList>
            <DescriptionList.Item term="Schermnaam">{supporter.screenName}</DescriptionList.Item>
            <DescriptionList.Item term="E-mailadres">{supporter.email}</DescriptionList.Item>
          </DescriptionList>
          <Text>Je e-mailadres ziet niemand anders.</Text>
        </Card>
        <Card aria-labelledby="uitloggen-kop" surface="soft">
          <Heading id="uitloggen-kop" level={2}>
            Uitloggen
          </Heading>
          <Text>Je blijft 90 dagen ingelogd na je laatste bezoek.</Text>
          <Form action={logOut}>
            <Button appearance="soft" type="submit">
              Uitloggen
            </Button>
          </Form>
          <Form action={logOutEverywhere}>
            <Button appearance="soft" type="submit">
              Uitloggen op alle apparaten
            </Button>
          </Form>
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
