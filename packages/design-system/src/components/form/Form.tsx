import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type FormProps = ComponentPropsWithoutRef<'form'>

/**
 * A form. It switches off the validation of the browser by default (`noValidate`): the site
 * checks the answers itself and shows the errors with a Field and an ErrorSummary, in our
 * words, where the browser shows a bubble in its own language that the screen reader may not
 * read out. Pass `noValidate={false}` to get the validation of the browser back.
 */
export const Form = ({ className, noValidate = true, ...props }: FormProps) => (
  <form className={classNames('hf-form', className)} noValidate={noValidate} {...props} />
)
