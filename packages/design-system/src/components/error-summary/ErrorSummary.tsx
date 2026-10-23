import { type ComponentPropsWithoutRef, useId } from 'react'

import { classNames } from '../classNames'
import { Heading, type HeadingLevel } from '../heading/Heading'
import { Link } from '../link/Link'
import { List } from '../list/List'

export type ErrorSummaryError = {
  /** The `id` of the field with the error: the link goes to it. */
  id: string
  /** The error, as the Field shows it. */
  message: string
}

export type ErrorSummaryProps = Omit<ComponentPropsWithoutRef<'section'>, 'children'> & {
  /** The errors, in the order of the fields. Without errors, the summary is not shown. */
  errors: readonly ErrorSummaryError[]
  /** The level of the heading in the structure of the page. */
  level: HeadingLevel
  /** The heading of the block. */
  title?: string
}

/**
 * A block at the top of a form with a heading and a link to every field with an error, so a person finds them at once.
 * It is a region with the heading as its name. Without errors, it renders nothing.
 */
export const ErrorSummary = ({ className, errors, level, title = 'Er is iets mis', ...props }: ErrorSummaryProps) => {
  const headingId = useId()

  if (errors.length === 0) {
    return null
  }

  return (
    <section aria-labelledby={headingId} className={classNames('hf-error-summary', className)} {...props}>
      <Heading appearance={3} id={headingId} level={level}>
        {title}
      </Heading>
      <List>
        {errors.map((error) => (
          <List.Item key={error.id}>
            <Link href={`#${error.id}`}>{error.message}</Link>
          </List.Item>
        ))}
      </List>
    </section>
  )
}
