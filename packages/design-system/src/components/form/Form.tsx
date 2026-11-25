import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type FormActionsProps = ComponentPropsWithoutRef<'div'>

export type FormButtonsProps = ComponentPropsWithoutRef<'div'>

export type FormProps = ComponentPropsWithoutRef<'form'> & {
  /**
   * Puts the fields and the button on one line, such as a search field with its button. The
   * line breaks only where there is no room. Without it, they stand under each other.
   */
  inline?: boolean
}

/**
 * The buttons of a form that has more than one: columns of the same width with space between
 * them, as many as fit, so each button is a large target on a phone. It only works inside a
 * Form, so it is written as Form.Buttons.
 */
const Buttons = ({ className, ...props }: FormButtonsProps) => (
  <div className={classNames('hf-form-buttons', className)} {...props} />
)

// The name in React's developer tools and in the code examples in Storybook.
Buttons.displayName = 'Form.Buttons'

/**
 * The button that sends a form with something beside it, such as a link to another way in. They
 * stand on one line, and what is beside the button goes under it where there is no room. The
 * order on the screen is the order of the keyboard. It only works inside a Form, so it is
 * written as Form.Actions.
 */
const Actions = ({ className, ...props }: FormActionsProps) => (
  <div className={classNames('hf-form-actions', className)} {...props} />
)

// The name in React's developer tools and in the code examples in Storybook.
Actions.displayName = 'Form.Actions'

/**
 * A form. It switches off the validation of the browser by default (`noValidate`): the site
 * checks the answers itself and shows the errors with a Field and an ErrorSummary, in our
 * words, where the browser shows a bubble in its own language that the screen reader may not
 * read out. Pass `noValidate={false}` to get the validation of the browser back.
 */
export const Form = ({ className, inline = false, noValidate = true, ...props }: FormProps) => (
  <form className={classNames('hf-form', inline && 'hf-form-inline', className)} noValidate={noValidate} {...props} />
)

Form.Actions = Actions
Form.Buttons = Buttons
