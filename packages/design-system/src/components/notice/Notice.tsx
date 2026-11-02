import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The role is always `status`, so it is not a prop. */
export type NoticeProps = Omit<ComponentPropsWithoutRef<'p'>, 'role'>

/**
 * A notice: a block with a line of text and `role="status"`, for the result of an action such
 * as "Opgeslagen." It has no heading, so every save does not add one to the outline of the
 * page. A screen reader announces the text of a status when it appears, without moving the
 * focus. A notice that is already there when the page loads is not announced as a status: it is
 * read in its place, like any other text. notice.css gives it its look.
 */
export const Notice = ({ className, ...props }: NoticeProps) => (
  <p {...props} className={classNames('hf-notice', className)} role="status" />
)
