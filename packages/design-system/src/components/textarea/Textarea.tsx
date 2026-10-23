import type { ComponentPropsWithoutRef } from 'react'

export type TextareaProps = ComponentPropsWithoutRef<'textarea'>

/** A text field of more than one line. Put it in a Field, which gives it its label, hint and error. */
export const Textarea = (props: TextareaProps) => <textarea {...props} />
