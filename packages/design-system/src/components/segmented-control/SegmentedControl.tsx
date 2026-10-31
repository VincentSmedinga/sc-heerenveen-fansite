import type { ComponentPropsWithoutRef } from 'react'

import type { Size } from '../size'

import { Button } from '../button/Button'
import { classNames } from '../classNames'
import { attachIcon } from '../icon/attachIcon'
import { type FilledIconName, Icon } from '../icon/Icon'
import { segmentedGroup, SegmentedLabel } from './segmented'

export type SegmentedControlOption<Value extends string> = {
  /**
   * An icon in front of the text. The pressed button has its filled drawing and the others the
   * line, so the icon is a second sign of what is pressed, never the only one.
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
  /**
   * Called with the value of the button that is pressed, also when it is the one that is
   * already pressed.
   */
  onChange: (value: Value) => void
  /** The buttons, in order. */
  options: readonly SegmentedControlOption<Value>[]
  /** `default` is the standard size. `small` is lower, for a switch next to the content. */
  size?: Size
  /** The value of the button that is pressed. */
  value: Value
}

/**
 * A few buttons side by side, of which exactly one is pressed, such as Licht and Donker. It is
 * a group with a name, and each button says whether it is pressed with `aria-pressed`. The
 * group is a track, and the pressed button has a thumb under it that slides to a new choice.
 * The pressed button also has heavier letters, so it shows without colour. An option can have
 * an icon, filled on the pressed button. It holds no state: the page gives it the value and
 * handles the change.
 */
export const SegmentedControl = <Value extends string>({
  className,
  label,
  onChange,
  options,
  size = 'default',
  style,
  value,
  ...props
}: SegmentedControlProps<Value>) => {
  const {
    sizeClass,
    style: groupStyle,
    ...group
  } = segmentedGroup(
    options.map((option) => option.value),
    value,
    size,
    style,
  )

  return (
    <div
      {...props}
      {...group}
      aria-label={label}
      className={classNames('hf-segmented-control', sizeClass, className)}
      role="group"
      style={groupStyle}
    >
      {options.map((option) => (
        <Button
          aria-pressed={option.value === value}
          key={option.value}
          onClick={() => {
            onChange(option.value)
          }}
          type="button"
        >
          <SegmentedLabel text={option.label}>
            {option.icon === undefined
              ? option.label
              : attachIcon(
                  option.label,
                  <Icon appearance={option.value === value ? 'filled' : 'line'} name={option.icon} />,
                  'before',
                )}
          </SegmentedLabel>
        </Button>
      ))}
    </div>
  )
}
