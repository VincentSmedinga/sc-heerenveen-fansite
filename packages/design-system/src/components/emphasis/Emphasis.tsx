import type { ComponentPropsWithoutRef } from 'react'

/**
 * Text that is stressed when it is read aloud: an `em` element, shown in italics. It has no
 * class of its own, so it takes the type style around it.
 */
export const Emphasis = (props: ComponentPropsWithoutRef<'em'>) => <em {...props} />
