import { Link, Text } from '@fansite/design-system'

import { signUpPaths } from '#src/fans/sign-up'

/** The link back to Mijn account, above the heading of a page that changes something there. */
export function BackToAccount() {
  return (
    <Text>
      <Link href={signUpPaths.account} icon="arrow-left">
        Mijn account
      </Link>
    </Text>
  )
}
