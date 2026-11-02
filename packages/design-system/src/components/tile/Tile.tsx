import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { Card } from '../card/Card'
import { classNames } from '../classNames'
import { Heading } from '../heading/Heading'
import { type FilledIconName, Icon, type IconName } from '../icon/Icon'

/** The heading levels a Tile can have. The `h1` is the title of the page. */
export const tileLevels = [2, 3, 4] as const

export type TileGridProps = Omit<ComponentPropsWithoutRef<'ul'>, 'role'>

/** The icons a Tile can have: the ones with a line drawing only. */
export type TileIcon = Exclude<IconName, FilledIconName>

export type TileLevel = (typeof tileLevels)[number]

export type TileProps = Omit<ComponentPropsWithoutRef<'li'>, 'children' | 'title'> & {
  /** The description: one line that says what the visitor finds there, in plain words. */
  children: ReactNode
  /** Where the tile goes. The whole tile is the link, so there is one address. */
  href: string
  /**
   * An icon in front of the heading, to tell the tiles apart at a glance. It is hidden from
   * assistive technology and is never the only sign of where the tile goes. Without it the
   * text starts at the edge.
   */
  icon?: TileIcon
  /** The level of the heading in the structure of the page. It follows the content. */
  level: TileLevel
  /**
   * The name of the place the tile goes to, such as "Wedstrijden". It is the heading and the
   * text of the link, so the link is named by it alone.
   */
  title: string
}

/**
 * The grid the tiles stand in: a list, so a screen reader says how many there are, with the
 * tiles side by side where they fit and under each other on a narrow screen. It only holds
 * Tile elements, so it is written as Tile.Grid. Give it a name with `aria-label`.
 */
const Grid = ({ className, ...props }: TileGridProps) => (
  // role="list" keeps the list for a screen reader when the list style is none (Safari).
  <ul className={classNames('hf-tile-grid', className)} role="list" {...props} />
)

// The name in React's developer tools and in the code examples in Storybook.
Grid.displayName = 'Tile.Grid'

/**
 * A card that is one link, to a place on the site: a heading with the name of the place, a line
 * of description and, if you like, an icon. The heading holds the link, so the tile is named by
 * its text, and the whole tile can be clicked or tapped. It has one focus ring, around the
 * tile. Put tiles in a Tile.Grid, which makes the list.
 */
export const Tile = ({ children, className, href, icon, level, title, ...props }: TileProps) => (
  <li className={classNames('hf-tile-item', className)} {...props}>
    <Card as="div" className="hf-tile">
      {icon === undefined ? null : (
        <span className="hf-tile-icon">
          <Icon name={icon} />
        </span>
      )}
      <div className="hf-tile-body">
        <Heading appearance={4} className="hf-tile-title" level={level}>
          <a className="hf-tile-link" href={href}>
            {title}
          </a>
        </Heading>
        <p className="hf-tile-text">{children}</p>
      </div>
    </Card>
  </li>
)

Tile.Grid = Grid
