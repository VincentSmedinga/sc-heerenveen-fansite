import { Children, type ComponentPropsWithoutRef, type ReactNode } from 'react'

import { classNames } from '../classNames'

export type ChipProps = Omit<ComponentPropsWithoutRef<'a'>, 'children' | 'href'> & {
  /** The name of the choice, such as `Ajax`. */
  children: string
  /** The address without this choice. */
  href: string
  /** What a screen reader hears after the name. */
  removeLabel?: string
}

/**
 * A choice that is in force, as a link that takes it away: the name, and a cross that is
 * decoration. The link is named by the choice and `removeLabel`, such as "Ajax weghalen".
 */
export const Chip = ({ children, className, removeLabel = 'weghalen', ...props }: ChipProps) => (
  <a {...props} aria-label={`${children} ${removeLabel}`} className={classNames('hf-chip', className)}>
    {children}
    <svg aria-hidden="true" className="hf-chip-cross" fill="none" focusable="false" viewBox="0 0 12 12">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  </a>
)

export type ChipListProps = Omit<ComponentPropsWithoutRef<'ul'>, 'aria-label' | 'children'> & {
  /** The chips, each a `Chip`. */
  children: ReactNode
  /** What the list is, such as `Gekozen filters`. */
  label: string
}

/** The chips of a search side by side, wrapping onto the next line when they do not fit. */
export const ChipList = ({ children, className, label, ...props }: ChipListProps) => (
  <ul {...props} aria-label={label} className={classNames('hf-chip-list', className)} role="list">
    {Children.toArray(children).map((chip, index) => (
      <li key={index}>{chip}</li>
    ))}
  </ul>
)
