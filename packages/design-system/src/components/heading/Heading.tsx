import { Children, type ComponentPropsWithoutRef, type ReactNode } from 'react'

import { classNames } from '../classNames'
import { attachIcon } from '../icon/attachIcon'
import { Icon } from '../icon/Icon'
import { anchorIdMaxLength, isAnchorId, isOldAnchorId } from './anchor'

/** The heading levels a Heading can have. Levels 5 and 6 are only a fallback in CSS. */
export const headingLevels = [1, 2, 3, 4] as const

/** The levels that can have an anchor. The `h1` is the title of the page and has none. */
export const anchorLevels = [2, 3, 4] as const

export type AnchorLevel = (typeof anchorLevels)[number]

export type HeadingLevel = (typeof headingLevels)[number]

export type HeadingProps =
  | (HeadingBaseProps & {
      /**
       * The ids this heading used to have, so a link that points to one of them still works.
       * Each becomes an empty element with that id inside the heading. Leave an id here for as
       * long as someone may have a link to it.
       */
      aliases?: readonly string[]
      anchor: true
      /**
       * The anchor: small letters, digits and hyphens, Dutch and short (`wie-we-zijn`). The
       * page chooses it and it does not follow the text of the heading, so the link stays the
       * same when the text changes.
       */
      id: string
      level: AnchorLevel
    })
  | (HeadingBaseProps & {
      aliases?: undefined
      /** Makes the heading a link to itself (`h2` to `h4`). It needs an `id` then. */
      anchor?: false
      id?: string
      /** The level in the structure of the page. It follows the content, not the look. */
      level: HeadingLevel
    })

type HeadingBaseProps = Omit<ComponentPropsWithoutRef<'h1'>, 'id'> & {
  /**
   * The style, as the number of the type style: 2 looks like Kop 2. Without it, the style
   * follows the level.
   */
  appearance?: HeadingLevel
}

// The icon follows the last word of the heading, so it never stands on a line of its own. A
// last word that is long can still break: only its last letter goes with the icon (see
// attachIcon). When the heading ends in something other than text, such as a span with small
// print, the icon goes behind a word joiner, which allows no break between them.
const withIcon = (children: ReactNode) => {
  const nodes = Children.toArray(children)
  const icon = <Icon name="link" />

  return typeof nodes.at(-1) === 'string'
    ? attachIcon(nodes, icon, 'after', 'letter')
    : [
        ...nodes,
        <span className="hf-icon-tail" key="icon">
          {'⁠'}
          {icon}
        </span>,
      ]
}

const checkAnchor = (level: number, id: string, aliases: readonly string[]) => {
  if (!(anchorLevels as readonly number[]).includes(level)) {
    throw new Error(`Heading: only an h2 to h4 can have an anchor, not an h${level}.`)
  }

  if (!isAnchorId(id)) {
    throw new Error(
      `Heading: "${id}" is not an id for an anchor. Use small letters, digits and single hyphens, at most ${anchorIdMaxLength} characters, such as "wie-we-zijn".`,
    )
  }

  for (const alias of aliases) {
    if (!isOldAnchorId(alias) || alias === id) {
      throw new Error(`Heading: "${alias}" is not an old anchor: it is empty, has a space, or is the anchor itself.`)
    }
  }
}

/**
 * A heading. The level (`h1` to `h4`) is separate from the style, so a card title can be an
 * `h2` that looks like Kop 3.
 *
 * With `anchor` the heading is a link to itself: its text is the link, in the colour of the
 * heading, with a chain link behind it that shows with the mouse over it, with the focus, and
 * always on a touch screen. The name of the link is the text of the heading. The page chooses
 * the `id` (see anchor.ts for the rules) and the heading that is the target gets a marker.
 */
export const Heading = ({
  aliases = [],
  anchor,
  appearance,
  children,
  className,
  id,
  level,
  ...props
}: HeadingProps) => {
  const Element = `h${level}` as const
  const style = `hf-heading-${appearance ?? level}`

  if (anchor !== true) {
    return (
      <Element className={classNames(style, className)} id={id} {...props}>
        {children}
      </Element>
    )
  }

  checkAnchor(level, id ?? '', aliases)

  return (
    <Element className={classNames(style, 'hf-heading-anchored', className)} id={id} {...props}>
      {aliases.map((alias) => (
        <span className="hf-heading-alias" id={alias} key={alias} />
      ))}
      <a className="hf-heading-link" href={`#${id}`}>
        {withIcon(children)}
      </a>
    </Element>
  )
}
