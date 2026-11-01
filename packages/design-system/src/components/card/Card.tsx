import { Children, type ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { CardShare, type CardShareProps } from './CardShare'

/** The elements a Card can be. */
export const cardElements = ['section', 'div', 'article', 'aside'] as const

export type CardElement = (typeof cardElements)[number]

/**
 * The surfaces a Card can have: the four the colour tokens name (the surface (white), strong,
 * soft and warm) and `transparent`, which has no background or border to see.
 */
export const cardSurfaces = ['default', 'strong', 'soft', 'warm', 'transparent'] as const

export type CardProps = ComponentPropsWithoutRef<'section'> & {
  /**
   * `section` (default), `div`, `article` or `aside`. A `section` takes its name from its
   * heading with `aria-labelledby`.
   */
  as?: CardElement
  /**
   * Gives the card a round button at the top right that makes an image of it, with the logo,
   * the address of the site, the day and `source` under it, and shares or downloads it.
   * `source` is the credit of the data in the card: it is required, so an image never leaves
   * the card without the name of where its facts come from. The button is named after the
   * first heading of the card and shows only with JavaScript. The card needs that heading as
   * its first child. A part of the card that is not for the image, such as a line that holds
   * for a while, takes the attribute `data-hf-card-share-skip`. Without `shareable` the card is
   * as it was.
   */
  shareable?: CardShareProps | undefined
  /**
   * The surface: `default` is the white one. Its background and border come from the colour
   * tokens of that surface. `transparent` keeps the padding at the sides and the space of the
   * border, so the text sits where it does in the other cards, but shows no background or
   * border and has no padding above and below.
   */
  surface?: CardSurface
}

export type CardSurface = (typeof cardSurfaces)[number]

/**
 * A card: a surface with a border, rounded corners and padding. It has no margin to the
 * outside: in a column of the page every card is a cell of its own, and the Page.Body sets the
 * space between the cells. card.css gives it its look.
 */
export const Card = ({
  as: Element = 'section',
  children,
  className,
  shareable,
  surface = 'default',
  ...props
}: CardProps) => {
  // The button comes straight after the heading, so the keyboard reaches it before the content.
  const [heading, ...rest] = Children.toArray(children)

  return (
    <Element
      className={classNames(
        'hf-card',
        surface !== 'default' && `hf-card-${surface}`,
        shareable && 'hf-card-shareable',
        className,
      )}
      {...props}
    >
      {shareable
        ? [heading, <CardShare key="share" season={shareable.season} source={shareable.source} />, ...rest]
        : children}
    </Element>
  )
}
