import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { type Size, sizeClassName } from '../size'

export type SelectOptionProps = ComponentPropsWithoutRef<'option'>

export type SelectProps = Omit<ComponentPropsWithoutRef<'select'>, 'size'> & {
  /**
   * `default` is the standard size. `small` is lower, for a list next to the content. It takes
   * the place of the `size` of the HTML element, which is a number of rows.
   */
  size?: Size
}

/**
 * A choice in a Select: an `option` element. It only works inside a Select, so it is written as
 * Select.Option.
 */
const Option = (props: SelectOptionProps) => <option {...props} />

// The name in React's developer tools and in the code examples in Storybook.
Option.displayName = 'Select.Option'

/**
 * A list to choose one answer from, with a Select.Option for every choice. Put it in a Field,
 * which gives it its label, hint and error.
 */
export const Select = ({ className, size = 'default', ...props }: SelectProps) => (
  <select className={classNames(sizeClassName(size), className)} {...props} />
)

Select.Option = Option
