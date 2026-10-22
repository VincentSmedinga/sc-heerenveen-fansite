import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The elements a Card can be. */
export const cardElements = ['section', 'div', 'article', 'aside'] as const

export type CardElement = (typeof cardElements)[number]

/** The four surfaces a Card can have, as the colour tokens name them: the surface (white), strong, soft and warm. */
export const cardSurfaces = ['default', 'strong', 'soft', 'warm'] as const

export type CardProps = ComponentPropsWithoutRef<'section'> & {
  /** `section` (default), `div`, `article` or `aside`. A `section` takes its name from its heading with `aria-labelledby`. */
  as?: CardElement
  /** The surface: `default` is the white one. Its background and border come from the colour tokens of that surface. */
  surface?: CardSurface
}

export type CardSurface = (typeof cardSurfaces)[number]

/**
 * A card: a surface with a border, rounded corners and padding. It has no margin to the outside: in a column of the page
 * every card is a cell of its own, and the Page.Body sets the space between the cells. card.css gives it its look.
 */
export const Card = ({ as: Element = 'section', className, surface = 'default', ...props }: CardProps) => (
  <Element className={classNames('hf-card', surface !== 'default' && `hf-card-${surface}`, className)} {...props} />
)
