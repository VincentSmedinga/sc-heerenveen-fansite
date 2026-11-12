import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { Button, Card, DescriptionList, Form, Heading, Page, RadioGroup, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { nameOf, roleLabels } from '#src/beheer/account-fields'
import { findAccount } from '#src/beheer/account-management'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { submitConflictMail } from './actions'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Mijn account' }

type SearchParams = Record<string, string | string[] | undefined>

const notices: Readonly<Record<string, { text: string; title: string }>> = {
  ongewijzigd: { text: 'Je keuze was al zo, dus er is niets veranderd.', title: 'Niets veranderd' },
  opgeslagen: { text: 'Je keuze voor de mail is opgeslagen.', title: 'Opgeslagen' },
}

// The account that is logged in (issue 1156): its first name, address and role, and for an
// owner or an editor the choice to get the mail about a difference with Wikipedia. Every role
// has this page. The choice is a form with a server action, so it works without JavaScript.
export default async function MyAccountPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { userId } = await requireRole(...adminRoles)
  const account = await findAccount(getDatabase().db, userId)

  if (account === undefined) {
    notFound()
  }

  const { gedaan } = await searchParams
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined
  const getsMail = account.role !== 'author'

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Heading level={1}>Mijn account</Heading>
          <Text appearance="intro">
            {account.role === 'owner'
              ? 'Je voornaam en adres wijzig je bij Accounts.'
              : 'Wil je je voornaam, adres of rol anders? Vraag het de eigenaar.'}
          </Text>
        </>
      }
    >
      {notice === undefined ? null : (
        <Card aria-labelledby="gedaan-kop" surface="soft">
          <Heading id="gedaan-kop" level={2}>
            {notice.title}
          </Heading>
          <Text>{notice.text}</Text>
        </Card>
      )}
      <Card aria-labelledby="gegevens-kop">
        <Heading id="gegevens-kop" level={2}>
          Gegevens
        </Heading>
        <DescriptionList>
          <DescriptionList.Item term="Voornaam">{nameOf(account.firstName)}</DescriptionList.Item>
          <DescriptionList.Item term="E-mailadres">{account.email}</DescriptionList.Item>
          <DescriptionList.Item term="Rol">{roleLabels[account.role]}</DescriptionList.Item>
        </DescriptionList>
      </Card>
      {getsMail ? (
        <Card aria-labelledby="mail-kop">
          <Heading id="mail-kop" level={2}>
            Mail over Wikipedia
          </Heading>
          <Form action={submitConflictMail}>
            <RadioGroup
              hint="Wijkt Wikipedia af van wat de redactie invulde, dan krijg je een mail. Die mail krijgen de eigenaar en de redacteuren."
              id="mail"
              legend="Mail over afwijkingen van Wikipedia"
              name="mail"
              options={[
                { label: 'Aan', value: 'aan' },
                { label: 'Uit', value: 'uit' },
              ]}
              value={account.conflictMail ? 'aan' : 'uit'}
            />
            <Button type="submit">Opslaan</Button>
          </Form>
        </Card>
      ) : null}
    </Page.Main>
  )
}
