import type { ReactNode } from 'react'

import { classNames } from '../classNames'
import { tableColumns } from '../table-columns'
import { Text } from '../text/Text'

/**
 * The key to the letters of a form chart: W for winst (3 punten), G for gelijk (1) and V for
 * verlies (0). The words are those of the columns under the tables, so the two agree. It is
 * the part that `FormChart` and `FormTimeline` share, and it is not exported by itself.
 * `children` is more text in the same paragraph, after the key.
 */
export const FormKey = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <Text appearance="meta" className={classNames('hf-form-key', className)}>
    <b>{tableColumns.won.abbreviation}</b> {tableColumns.won.name} (3 punten), <b>{tableColumns.drawn.abbreviation}</b>{' '}
    {tableColumns.drawn.name} (1), <b>{tableColumns.lost.abbreviation}</b> {tableColumns.lost.name} (0).
    {children !== undefined && <> {children}</>}
  </Text>
)
