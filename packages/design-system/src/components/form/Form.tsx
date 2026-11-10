import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type FormButtonsProps = ComponentPropsWithoutRef<'div'>

export type FormProps = ComponentPropsWithoutRef<'form'>

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
 * A form. It switches off the validation of the browser by default (`noValidate`): the site
 * checks the answers itself and shows the errors with a Field and an ErrorSummary, in our
 * words, where the browser shows a bubble in its own language that the screen reader may not
 * read out. Pass `noValidate={false}` to get the validation of the browser back.
 */
export const Form = ({ className, noValidate = true, ...props }: FormProps) => (
  <form className={classNames('hf-form', className)} noValidate={noValidate} {...props} />
)

Form.Buttons = Buttons
