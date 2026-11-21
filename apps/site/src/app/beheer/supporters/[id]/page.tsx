import type { Metadata } from 'next'

import { Button, Card, DescriptionList, Form, Heading, Link, Notice, Page, Tag, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { findSupporter } from '#src/beheer/supporter-management'
import { getDatabase } from '#src/database'
import { FocusOnLoad } from '#src/FocusOnLoad'

import { blockAccount, renameAccount, unblockAccount } from '../actions'
import { supportersPath } from '../paths'
import { BlockForm, RenameForm } from '../SupporterForms'

// Render on each request: the account changes with every action.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Supporter' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const timeZone = 'Europe/Amsterdam'
const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone, year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone: 'UTC', year: 'numeric' })

const notices: Readonly<Record<string, { text: string; title: string }>> = {
  geblokkeerd: { text: 'De blokkade staat in het logboek.', title: 'Account geblokkeerd' },
  naam: {
    text: 'De supporter ziet op Mijn account één keer dat de redactie de naam heeft aangepast.',
    title: 'Naam aangepast',
  },
  ongewijzigd: { text: 'Er is niets veranderd.', title: 'Niets veranderd' },
  vrijgegeven: { text: 'De opheffing staat in het logboek.', title: 'Blokkade opgeheven' },
}

// The page of one account of a supporter for the editors (issue 1458): what the site keeps of
// it that an editor needs, and the forms to change the name and to block or unblock it. The
// e-mail address is only read and shown for the owner, so an editor never gets it, not even in
// the HTML.
export default async function SupporterPage({ params, searchParams }: Props) {
  const { role } = await requireRole('owner', 'editor')

  requireFansPart('accounts', notFound)

  const id = parseItemId((await params).id)
  const supporter = id === undefined ? undefined : await findSupporter(getDatabase().db, id, role === 'owner')

  if (supporter === undefined) {
    notFound()
  }

  const { gedaan } = await searchParams
  const notice = typeof gedaan === 'string' && Object.hasOwn(notices, gedaan) ? notices[gedaan] : undefined

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>{supporter.screenName}</Heading>
        <Text appearance="intro">
          Een supporter, aangemaakt op {dateFormat.format(supporter.createdAt)}.
          {supporter.blocked ? ' Het account is geblokkeerd.' : ''}
        </Text>
        <Text>
          <Link href={supportersPath}>Terug naar de supporters</Link>
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {notice === undefined ? null : (
          <>
            <Notice id="gedaan" tabIndex={-1}>{`${notice.title}. ${notice.text}`}</Notice>
            <FocusOnLoad id="gedaan" />
          </>
        )}
        <Card aria-labelledby="gegevens-kop">
          <Heading id="gegevens-kop" level={2}>
            Gegevens
          </Heading>
          <DescriptionList aligned stacked>
            <DescriptionList.Item term="Schermnaam">{supporter.screenName}</DescriptionList.Item>
            {supporter.email === undefined ? null : (
              <DescriptionList.Item term="E-mailadres">{supporter.email}</DescriptionList.Item>
            )}
            <DescriptionList.Item term="Aangemaakt op">{dateFormat.format(supporter.createdAt)}</DescriptionList.Item>
            <DescriptionList.Item term="Laatste bezoek">
              {supporter.lastVisitOn === null ? 'Nog niet' : dayFormat.format(new Date(supporter.lastVisitOn))}
            </DescriptionList.Item>
            <DescriptionList.Item term="Status">
              {supporter.blocked ? (
                <>
                  <Tag tone="highlight">Geblokkeerd</Tag>
                  {supporter.blockedAt === null ? '' : ` sinds ${dateFormat.format(supporter.blockedAt)}`}
                  {supporter.blockedReason === null ? '' : `: ${supporter.blockedReason}`}
                </>
              ) : (
                'Actief'
              )}
            </DescriptionList.Item>
          </DescriptionList>
        </Card>
        <Card aria-labelledby="naam-kop">
          <Heading id="naam-kop" level={2}>
            Schermnaam aanpassen
          </Heading>
          <Text>
            Voor een naam die kwetst of misleidt. Dit telt niet als de eigen wijziging van de supporter, die één keer
            per 30 dagen mag.
          </Text>
          <RenameForm
            action={renameAccount.bind(null, supporter.id)}
            key={supporter.screenName}
            screenName={supporter.screenName}
          />
        </Card>
        <Card aria-labelledby="blokkade-kop">
          <Heading id="blokkade-kop" level={2}>
            {supporter.blocked ? 'Blokkade opheffen' : 'Account blokkeren'}
          </Heading>
          {supporter.blocked ? (
            <>
              <Text>De supporter kan dan weer meedoen aan de spellen.</Text>
              <Form action={unblockAccount.bind(null, supporter.id)}>
                <Button type="submit">Hef de blokkade van {supporter.screenName} op</Button>
              </Form>
            </>
          ) : (
            <>
              <Text>
                Een geblokkeerd account kan nog inloggen, zijn gegevens zien en zijn account opheffen. Het kan niet
                meedoen aan een spel, zijn naam niet wijzigen en staat in geen enkele stand. De supporter krijgt geen
                mail.
              </Text>
              <BlockForm
                action={blockAccount.bind(null, supporter.id)}
                key={`${supporter.id}-blok`}
                screenName={supporter.screenName}
              />
            </>
          )}
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
