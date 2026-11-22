import { Page } from '@fansite/design-system'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { rulesShortcuts } from '#src/fans/rules-shortcuts'

// Render on each request, like the page it belongs to: the parts of Fans are read when the
// server runs.
export const dynamic = 'force-dynamic'

/** The bar of the page with the rules (see `rulesShortcuts`), only while accounts are on. */
export default function RulesShortcuts() {
  return isFansPartOn('accounts') ? <Page.Shortcuts items={rulesShortcuts()} label="Op deze pagina:" /> : null
}
