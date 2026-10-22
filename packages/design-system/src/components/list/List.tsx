import type { ComponentPropsWithoutRef } from 'react'

/** The elements a List can be. */
export const listElements = ['ul', 'ol'] as const

export type ListElement = (typeof listElements)[number]

export type ListItemProps = ComponentPropsWithoutRef<'li'>

export type ListProps =
  | (ComponentPropsWithoutRef<'ol'> & {
      as: 'ol'
    })
  | (ComponentPropsWithoutRef<'ul'> & {
      /** `ul` for a bulleted list, `ol` for a numbered one. */
      as?: 'ul'
    })

/** An item of a List: an `li` element. It only works inside a List, so it is written as List.Item. */
const Item = (props: ListItemProps) => <li {...props} />

// The name in React's developer tools and in the code examples in Storybook.
Item.displayName = 'List.Item'

/** A list of List.Item elements, bulleted or numbered. list.css gives it its look. */
export const List = (props: ListProps) => {
  if (props.as === 'ol') {
    const { as: Element, ...rest } = props

    return <Element {...rest} />
  }

  const { as: Element = 'ul', ...rest } = props

  return <Element {...rest} />
}

List.Item = Item
