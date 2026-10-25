import type { ComponentPropsWithoutRef } from 'react'

export type SelectOptionProps = ComponentPropsWithoutRef<'option'>

export type SelectProps = ComponentPropsWithoutRef<'select'>

/** A choice in a Select: an `option` element. It only works inside a Select, so it is written as Select.Option. */
const Option = (props: SelectOptionProps) => <option {...props} />

// The name in React's developer tools and in the code examples in Storybook.
Option.displayName = 'Select.Option'

/**
 * A list to choose one answer from, with a Select.Option for every choice. Put it in a Field, which gives it its label,
 * hint and error.
 */
export const Select = (props: SelectProps) => <select {...props} />

Select.Option = Option
