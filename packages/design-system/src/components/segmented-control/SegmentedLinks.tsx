import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type SegmentedLinksOption = {
  /** Where the link goes. */
  href: string
  /** What the link says. */
  label: string
  /** Tells the options apart: the page gives the value of the option it shows. */
  value: string
}

export type SegmentedLinksProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The name of the group, for a screen reader, such as "Welke wedstrijden". */
  label: string
  /** The links, in order. */
  options: readonly SegmentedLinksOption[]
  /** The value of the option the page shows now. */
  value: string
}

/**
 * The same choice as a SegmentedControl, for a choice that is an address and so works without
 * JavaScript: each option is a link, and the one the page shows has `aria-current="page"`. It
 * is a group with a name, filled on the current option and an outline on the others, so it
 * shows without colour. It holds no state: the page gives the value and the addresses, and a
 * press loads the page of that option.
 */
export const SegmentedLinks = ({ className, label, options, value, ...props }: SegmentedLinksProps) => (
  <div {...props} aria-label={label} className={classNames('hf-segmented-control', className)} role="group">
    {options.map((option) => (
      <a aria-current={option.value === value ? 'page' : undefined} href={option.href} key={option.value}>
        {option.label}
      </a>
    ))}
  </div>
)
