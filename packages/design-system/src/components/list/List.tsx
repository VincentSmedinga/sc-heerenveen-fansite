import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The elements a List can be. */
export const listElements = ['ul', 'ol'] as const

export type ListElement = (typeof listElements)[number]

export type ListItemProps = ComponentPropsWithoutRef<'li'>

export type ListProps =
  | (ComponentPropsWithoutRef<'ol'> &
      LooseProps & {
        as: 'ol'
      })
  | (ComponentPropsWithoutRef<'ul'> &
      LooseProps & {
        /** `ul` for a bulleted list, `ol` for a numbered one. */
        as?: 'ul'
      })

type LooseProps = {
  /**
   * A loose list, as Markdown calls it: there is space between the items, with or
   * without a paragraph in them.
   */
  loose?: boolean
  /**
   * A list without markers and without the indent, for a few short lines that must fit the
   * width of a phone, such as facts in a card. The list has no markers, so give it
   * `role="list"`: some screen readers then no longer announce it as a list.
   */
  plain?: boolean
}

/**
 * An item of a List: an `li` element. It only works inside a List, so it is written as
 * List.Item.
 */
const Item = (props: ListItemProps) => <li {...props} />

// The name in React's developer tools and in the code examples in Storybook.
Item.displayName = 'List.Item'

/** A list of List.Item elements, bulleted or numbered. list.css gives it its look. */
export const List = (props: ListProps) => {
  if (props.as === 'ol') {
    const { as: Element, className, loose, plain, ...rest } = props

    return <Element className={classNames(loose && 'hf-list-loose', plain && 'hf-list-plain', className)} {...rest} />
  }

  const { as: Element = 'ul', className, loose, plain, ...rest } = props

  return <Element className={classNames(loose && 'hf-list-loose', plain && 'hf-list-plain', className)} {...rest} />
}

List.Item = Item
