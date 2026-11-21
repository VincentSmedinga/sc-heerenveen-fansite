import type { Metadata } from 'next'

import { Button, Card, DescriptionList, Form, Heading, Link, Notice, Page, Text } from '@fansite/design-system'
import { eq } from 'drizzle-orm'

import { getDatabase } from '#src/database'
import { accountMessageOf } from '#src/fans/account-form'
import { changeEmailPaths } from '#src/fans/change-email'
import { changeNamePath } from '#src/fans/change-name'
import { requireSupporter } from '#src/fans/require-supporter'
import { signUpPaths } from '#src/fans/sign-up'
import { supporterKind } from '#src/fans/supporter-login'
import { FocusOnLoad } from '#src/FocusOnLoad'
import { pageAreas } from '#src/page-areas'

import { logOut, logOutEverywhere } from './actions'
import { RankingsSwitch } from './RankingsSwitch'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Mijn account' }

const noticeId = 'melding'

// The cards with the data stand in the wide column, the soft cards in the narrow one; on a
// phone the narrow column comes after the wide one. #1454 adds the cards "Wat je speelde" and
// "Account opheffen".
const areas = pageAreas({ after: ['side'] })

// The account of the supporter who is logged in: the screen name, the address and the choice
// for the rankings, each with the way to change it, and the card to log out. A blocked
// supporter sees it too, but can only log out.
export default async function MyAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supporter = await requireSupporter({ blocked: 'allow', from: signUpPaths.account })
  const { users } = supporterKind.tables
  const [account] = await getDatabase()
    .db.select({ inRankings: users.inRankings })
    .from(users)
    .where(eq(users.id, supporter.supporterId))
  const { melding } = await searchParams
  const message = accountMessageOf(melding)
  const change = (href: string, what: string) =>
    supporter.blocked ? null : (
      <Text>
        <Link href={href}>
          Wijzigen<Text as="span" className="hf-visually-hidden">{`, ${what}`}</Text>
        </Link>
      </Text>
    )

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Mijn account</Heading>
        {message === undefined ? null : (
          <>
            <Notice id={noticeId} tabIndex={-1}>
              {message}
            </Notice>
            <FocusOnLoad id={noticeId} />
          </>
        )}
      </Page.Cell>
      <Page.Cell area="main">
        <Card aria-labelledby="gegevens-kop">
          <Heading id="gegevens-kop" level={2}>
            Jouw gegevens
          </Heading>
          <DescriptionList stacked>
            <DescriptionList.Item term="Schermnaam">
              <Text>{supporter.screenName}</Text>
              <Text appearance="meta">Je kunt hem één keer per 30 dagen wijzigen.</Text>
              {change(changeNamePath, 'schermnaam')}
            </DescriptionList.Item>
            <DescriptionList.Item term="E-mailadres">
              <Text>{supporter.email}</Text>
              <Text appearance="meta">Alleen om in te loggen. Niemand anders ziet het.</Text>
              {change(changeEmailPaths.form, 'e-mailadres')}
            </DescriptionList.Item>
          </DescriptionList>
          {supporter.blocked ? null : <RankingsSwitch on={account?.inRankings ?? true} />}
        </Card>
      </Page.Cell>
      <Page.Section area="side" aria-label="Uitloggen en je account">
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
      </Page.Section>
    </Page.Main>
  )
}
