import type { ComponentPropsWithoutRef } from 'react'

/**
 * Text that matters more than the text around it: a `strong` element. It has no class of its
 * own: the weight comes from the base styles, so it takes the type style around it.
 */
export const Strong = (props: ComponentPropsWithoutRef<'strong'>) => <strong {...props} />
