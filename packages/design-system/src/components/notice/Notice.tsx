import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The role is always `status`, so it is not a prop. */
export type NoticeProps = Omit<ComponentPropsWithoutRef<'p'>, 'role'>

/**
 * A notice: a block with a line of text and `role="status"`, for the result of an action such
 * as "Opgeslagen." It has no heading, so every save does not add one to the outline of the
 * page. A screen reader announces the text that comes into a status, without moving the focus,
 * but only when the status was in the page before: for a notice that follows an action, put the
 * notice in the page empty and fill it when the action is done. An empty notice shows nothing
 * and takes no room. A notice that is already full when the page loads is read in its place,
 * like any other text. notice.css gives it its look.
 */
export const Notice = ({ className, ...props }: NoticeProps) => (
  <p {...props} className={classNames('hf-notice', className)} role="status" />
)
