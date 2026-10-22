import type { ComponentPropsWithoutRef } from 'react'

export type BodyProps = ComponentPropsWithoutRef<'body'>

/** The `body` element of a page. Its colours, font and margin come from body.css. */
export const Body = (props: BodyProps) => <body {...props} />
