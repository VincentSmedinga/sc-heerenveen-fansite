import type { ComponentPropsWithoutRef } from 'react'

/** The elements a List can be. */
export const listElements = ['ul', 'ol'] as const

export type ListElement = (typeof listElements)[number]

export type ListProps =
  | (ComponentPropsWithoutRef<'ol'> & {
      as: 'ol'
    })
  | (ComponentPropsWithoutRef<'ul'> & {
      /** `ul` for a bulleted list, `ol` for a numbered one. */
      as?: 'ul'
    })

/** A list of `li` elements, bulleted or numbered. The base styles give it its look. */
export const List = (props: ListProps) => {
  if (props.as === 'ol') {
    const { as: Element, ...rest } = props

    return <Element {...rest} />
  }

  const { as: Element = 'ul', ...rest } = props

  return <Element {...rest} />
}
