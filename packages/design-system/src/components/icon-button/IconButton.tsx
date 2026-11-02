import type { ReactElement } from 'react'

import { Button, type ButtonProps } from '../button/Button'
import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'

/** The icons an IconButton can have. */
export const iconButtonIcons = ['trash'] as const

export type IconButtonIcon = (typeof iconButtonIcons)[number]

export type IconButtonProps = Omit<ButtonProps, 'aria-label' | 'children' | 'icon' | 'title'> & {
  /** The icon, which is all the button shows. */
  icon: IconButtonIcon
  /**
   * What the button does, with what it is for: "Doelpunt 2 weghalen". It is the name of the
   * button for a screen reader and the text that shows when the pointer rests on it. Required,
   * because an icon alone names nothing.
   */
  label: string
}

/**
 * A button that shows only an icon, such as a bin to remove one row among many. Use it where
 * the icon is known to everyone and a row of buttons would be noisy with words: for a main
 * action keep a Button with text. The `label` is its name; the icon is hidden from assistive
 * technology. It is as large as a Button, so a finger touches it as easily. icon-button.css
 * gives it its look.
 */
export const IconButton = ({
  appearance = 'soft',
  className,
  icon,
  label,
  ...props
}: IconButtonProps): ReactElement => (
  <Button
    {...props}
    appearance={appearance}
    aria-label={label}
    className={classNames('hf-icon-button', className)}
    title={label}
  >
    <Icon name={icon} />
  </Button>
)
