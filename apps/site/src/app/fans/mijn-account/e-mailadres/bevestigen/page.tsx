import type { Metadata } from 'next'

import { Button, Form, Heading, Page, Strong, Text } from '@fansite/design-system'

import { confirmEmailLink } from '#src/app/fans/mijn-account/actions'
import { getDatabase } from '#src/database'
import { changeEmailPaths, changeLinkState } from '#src/fans/change-email'
import { LinkGone } from '#src/fans/CheckMail'
import { requireSupporter } from '#src/fans/require-supporter'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The page the link in the mail to the new address opens. It changes nothing by itself: a mail
// scanner or a preview opens the link before the person does and would use it up. The button
// changes the address, in a session of the account that asked; without one the supporter logs
// in with the old address first and comes back here.
export default async function ConfirmChangePage({ searchParams }: Props) {
  const { address, token } = await stateOf(searchParams)

  return (
    <Page.Main>
      <Page.Cell>
        {token !== undefined && address !== undefined ? (
          <>
            <Heading level={1}>Bijna klaar</Heading>
            <Text appearance="intro">
              Je nieuwe e-mailadres wordt <Strong>{address}</Strong>.
            </Text>
            <Form action={confirmEmailLink.bind(null, token)}>
              <Button type="submit">E-mailadres bevestigen</Button>
            </Form>
            <Text>Deze knop staat er zodat een virusscanner in je mail de link niet voor je gebruikt.</Text>
          </>
        ) : (
          <LinkGone again={{ href: changeEmailPaths.form, label: 'Stuur een nieuwe' }} />
        )}
      </Page.Cell>
    </Page.Main>
  )
}

// The title follows the heading of the page, so a tab and a screen reader name what it says.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { address } = await stateOf(searchParams)

  return {
    robots: { follow: false, index: false },
    title: address === undefined ? 'Deze link werkt niet meer' : 'Bijna klaar',
  }
}

/** The request of the link in the address, which the title and the page both follow. */
async function stateOf(searchParams: Props['searchParams']) {
  const { token } = await searchParams
  const from =
    typeof token === 'string'
      ? `${changeEmailPaths.confirm}?${new URLSearchParams({ token }).toString()}`
      : changeEmailPaths.confirm
  const { supporterId } = await requireSupporter({ from })

  if (typeof token !== 'string') {
    return { address: undefined, token: undefined }
  }

  return { address: (await changeLinkState(getDatabase().db, supporterId, token))?.email, token }
}
