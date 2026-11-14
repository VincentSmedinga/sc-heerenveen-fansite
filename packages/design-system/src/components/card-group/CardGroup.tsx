import type { ComponentPropsWithoutRef } from 'react'

import { CardColumns } from '../card-columns/CardColumns'
import { classNames } from '../classNames'
import { Heading } from '../heading/Heading'

export type CardGroupProps = Omit<ComponentPropsWithoutRef<'section'>, 'aria-label' | 'aria-labelledby' | 'title'> & {
  /** The area of a Page.Main with `areas` that the group sits in, as named there. */
  area?: string
  /** The anchor of the heading, such as `uitslagen`: the bar "Op deze pagina" links to it. */
  id: string
  /** The heading of the group, a level 2. The cards in it have a heading of level 3. */
  title: string
}

/**
 * A group of cards under a heading of its own, on a page with many cards, such as the
 * statistics: a level 2 heading under a line, and the cards in two columns (CardColumns).
 * The group is a section named by its heading, so a screen reader finds it and the bar "Op
 * deze pagina" can link to it. The heading of each card in it is a level 3. The line has its
 * own colour, the darkest sand in light (`--hf-colour-border-group`). card-group.css sets it.
 */
export const CardGroup = ({ area, children, className, id, style, title, ...props }: CardGroupProps) => (
  <section
    {...props}
    aria-labelledby={id}
    className={classNames('hf-card-group', className)}
    style={area === undefined ? style : { gridArea: area, ...style }}
  >
    <Heading anchor id={id} level={2}>
      {title}
    </Heading>
    <CardColumns>{children}</CardColumns>
  </section>
)
