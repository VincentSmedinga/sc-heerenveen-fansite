import { Link, Text } from '@fansite/design-system'

import { predictionRulesAddress } from '#src/fans-paths'

/**
 * The line with the link to the rules of the game Prognose, which the form, the points, the
 * list of predictions and the ranking all show (issue 1455).
 */
export function RulesLink() {
  return (
    <Text>
      <Link href={predictionRulesAddress}>Spelregels</Link>
    </Text>
  )
}
