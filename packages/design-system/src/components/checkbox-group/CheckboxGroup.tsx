import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type CheckboxGroupOption = {
  /** What the checkbox says, such as the name of a source. */
  label: string
  /** What the form sends for it when it is checked, such as `leeuwarder-courant`. */
  value: string
}

export type CheckboxGroupProps = Omit<ComponentPropsWithoutRef<'fieldset'>, 'children' | 'name'> & {
  /** The name of the group, which a screen reader reads before each checkbox: a `legend`. */
  legend: string
  /** The name the form sends each checked value under. A box that is not checked sends none. */
  name: string
  /** The checkboxes, in the order shown. */
  options: readonly CheckboxGroupOption[]
  /** The values that are checked when the page opens. Without it nothing is checked. */
  value?: readonly string[]
}

/**
 * A group of checkboxes of which the visitor checks as many as they like, such as the sources
 * to show: a `fieldset` with a `legend` and a checkbox for each option. Each checkbox has a
 * label next to it that is part of the click target. It is a field of a form, so put it in a
 * Form, with a Button that sends it. The group has no state of its own: the browser keeps what
 * the visitor checks, and the form sends it.
 */
export const CheckboxGroup = ({ className, legend, name, options, value = [], ...props }: CheckboxGroupProps) => (
  <fieldset {...props} className={classNames('hf-checkbox-group', className)}>
    <legend className="hf-heading-2">{legend}</legend>
    {options.map((option) => (
      <label className="hf-checkbox-group-label" key={option.value}>
        <input defaultChecked={value.includes(option.value)} name={name} type="checkbox" value={option.value} />
        <span>{option.label}</span>
      </label>
    ))}
  </fieldset>
)
