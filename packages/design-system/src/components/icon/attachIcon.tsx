import { Children, type ReactNode } from 'react'

/**
 * Puts an icon in front of or behind some content and keeps it with the word next to it: that word and the icon go in a
 * group that does not break (`hf-icon-head` or `hf-icon-tail`, see icon.css), so a line breaks before the word and not
 * between the word and the icon. The icon never ends up alone on a line, also at 320 pixels wide and with large text.
 *
 * That needs text at the edge: the last child behind, the first child in front. A string is split at its last or first
 * space. Other content, such as an element, takes the icon alone in its group; it can then end up on a line of its own,
 * so end a link with text.
 */
export const attachIcon = (children: ReactNode, icon: ReactNode, place: 'after' | 'before'): ReactNode => {
  const nodes = Children.toArray(children)

  if (place === 'after') {
    const last = nodes.at(-1)
    const split = typeof last === 'string' ? /^([\s\S]*\s)?(\S+)\s*$/.exec(last) : null

    return [
      ...nodes.slice(0, split ? -1 : undefined),
      split?.[1],
      <span className="hf-icon-tail" key="icon">
        {split?.[2]}
        {icon}
      </span>,
    ]
  }

  const first = nodes[0]
  const split = typeof first === 'string' ? /^\s*(\S+)(\s[\s\S]*)?$/.exec(first) : null

  return [
    <span className="hf-icon-head" key="icon">
      {icon}
      {split?.[1]}
    </span>,
    split?.[2],
    ...nodes.slice(split ? 1 : 0),
  ]
}
