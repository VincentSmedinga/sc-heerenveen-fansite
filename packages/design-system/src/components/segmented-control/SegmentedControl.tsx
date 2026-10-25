import type { ComponentPropsWithoutRef } from 'react'

import { Button } from '../button/Button'
import { classNames } from '../classNames'
import { attachIcon } from '../icon/attachIcon'
import { type FilledIconName, Icon } from '../icon/Icon'

export type SegmentedControlOption<Value extends string> = {
  /**
   * An icon in front of the text. The pressed button has its filled drawing and the others the line, so the icon is a
   * second sign of what is pressed, never the only one.
   */
  icon?: FilledIconName
  /** What the button says. */
  label: string
  /** What `onChange` gets when the button is pressed. */
  value: Value
}

export type SegmentedControlProps<Value extends string> = Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange'
> & {
  /** A segmented control has no children: its buttons come from `options`. */
  children?: never
  /** The name of the group, for a screen reader, such as "Thema". */
  label: string
  /** Called with the value of the button that is pressed, also when it is the one that is already pressed. */
  onChange: (value: Value) => void
  /** The buttons, in order. */
  options: readonly SegmentedControlOption<Value>[]
  /** The value of the button that is pressed. */
  value: Value
}

/**
 * A few buttons side by side, of which exactly one is pressed, such as Licht and Donker. It is a group with a name, and
 * each button says whether it is pressed with `aria-pressed`. The pressed button is filled and the others are an outline,
 * so it shows without colour. An option can have an icon, filled on the pressed button. It holds no state: the page gives it the value and handles the change.
 */
export const SegmentedControl = <Value extends string>({
  className,
  label,
  onChange,
  options,
  value,
  ...props
}: SegmentedControlProps<Value>) => (
  <div {...props} aria-label={label} className={classNames('hf-segmented-control', className)} role="group">
    {options.map((option) => (
      <Button
        aria-pressed={option.value === value}
        key={option.value}
        onClick={() => {
          onChange(option.value)
        }}
        type="button"
      >
        {option.icon === undefined
          ? option.label
          : attachIcon(
              option.label,
              <Icon appearance={option.value === value ? 'filled' : 'line'} name={option.icon} />,
              'before',
            )}
      </Button>
    ))}
  </div>
)
