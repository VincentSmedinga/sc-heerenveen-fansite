import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { type Size, sizeClassName } from '../size'

/**
 * The widths a Select can have. `default` is the whole line, up to a maximum. `natural` is as
 * wide as the choice it shows, or as its longest choice in a browser that cannot tell.
 */
export const selectWidths = ['default', 'natural'] as const

export type SelectGroupProps = Omit<ComponentPropsWithoutRef<'optgroup'>, 'label'> & {
  /** The name of the group, which the list shows above its choices. */
  label: string
}

export type SelectOptionProps = ComponentPropsWithoutRef<'option'>

export type SelectProps = Omit<ComponentPropsWithoutRef<'select'>, 'size'> & {
  /**
   * `default` is the standard size. `small` is lower, for a list next to the content. It takes
   * the place of the `size` of the HTML element, which is a number of rows.
   */
  size?: Size
  /**
   * `natural` makes the list as wide as the choice it shows, for a short list of short words
   * such as a status. Use `default` where the choices are long, such as names.
   */
  width?: SelectWidth
}

export type SelectWidth = (typeof selectWidths)[number]

/**
 * A group of choices in a Select with a name above them: an `optgroup` element, for a long list
 * that has a part people choose most. It only works inside a Select, so it is written as
 * Select.Group.
 */
const Group = (props: SelectGroupProps) => <optgroup {...props} />

// The name in React's developer tools and in the code examples in Storybook.
Group.displayName = 'Select.Group'

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
export const Select = ({ className, size = 'default', width = 'default', ...props }: SelectProps) => (
  <select
    className={classNames(sizeClassName(size), width === 'natural' && 'hf-width-natural', className)}
    {...props}
  />
)

Select.Group = Group
Select.Option = Option
