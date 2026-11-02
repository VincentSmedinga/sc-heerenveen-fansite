import { Button, Form, SectionBar, Text } from '@fansite/design-system'

import { logOut } from '#src/app/beheer/actions'
import { sessionToken } from '#src/beheer/require-role'
import { findSession } from '#src/beheer/sessions'
import { getDatabase } from '#src/database'

import { currentScreen, screensFor } from './screens'

/**
 * The bar with the screens of the admin, under the main menu. It reads the session on the
 * server, so the screens are those of the role of the account, and without a valid session
 * there is no bar. It is no guard: the pages check the role themselves (requireRole).
 */
export async function AdminBar({ pathname }: { pathname: string }) {
  const token = await sessionToken()
  const session = token === undefined ? undefined : await findSession(getDatabase().db, token)

  if (session === undefined) {
    return null
  }

  const current = currentScreen(pathname)

  return (
    <SectionBar
      account={
        <>
          <Text as="span">
            {session.email}, {session.role}
          </Text>
          <Form action={logOut}>
            <Button appearance="soft" size="small" type="submit">
              Uitloggen
            </Button>
          </Form>
        </>
      }
      items={screensFor(session.role).map(({ href, label }) => ({ current: href === current, href, label }))}
      label="Beheer"
    />
  )
}
