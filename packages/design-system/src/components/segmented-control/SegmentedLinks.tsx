import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

import type { Size } from '../size'

import { classNames } from '../classNames'
import { segmentedGroup, SegmentedLabel } from './segmented'

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
  /**
   * Where the switch stands on the page, as a word the page picks, such as `stand`. Between two
   * pages the thumb only slides from a switch with the same place to one with the same place,
   * so the place must differ for switches that are not the same one. Letters, digits and
   * hyphens only. Without a place the switch does not take part in the slide.
   */
  place?: string
  /** `default` is the standard size. `small` is lower, for a switch next to the content. */
  size?: Size
  /** The value of the option the page shows now. */
  value: string
}

/**
 * The same choice as a SegmentedControl, for a choice that is an address and so works without
 * JavaScript: each option is a link, and the one the page shows has `aria-current="page"`. It
 * is a group with a name, a track with a thumb under the current option and heavier letters on
 * it, so it shows without colour. It holds no state: the page gives the value and the
 * addresses, and a press loads the page of that option. With a `place`, the thumb and the
 * options get names for the slide between two pages (see segmented-control.css): the names
 * belong to the place, so only a switch in the same place on the next page is the same element.
 */
export const SegmentedLinks = ({
  className,
  label,
  options,
  place,
  size = 'default',
  style,
  value,
  ...props
}: SegmentedLinksProps) => {
  const {
    sizeClass,
    style: groupStyle,
    ...group
  } = segmentedGroup(
    options.map((option) => option.value),
    value,
    size,
    place === undefined
      ? style
      : ({ ...style, '--hf-segmented-thumb-name': `hf-segmented-thumb-${place}` } as CSSProperties),
  )

  return (
    <div
      {...props}
      {...group}
      aria-label={label}
      className={classNames('hf-segmented-control', sizeClass, className)}
      role="group"
      style={groupStyle}
    >
      {options.map((option, index) => (
        <a
          aria-current={option.value === value ? 'page' : undefined}
          href={option.href}
          key={option.value}
          style={
            place === undefined
              ? undefined
              : ({ '--hf-segmented-option-name': `hf-segmented-option-${place}-${index + 1}` } as CSSProperties)
          }
        >
          <SegmentedLabel text={option.label}>{option.label}</SegmentedLabel>
        </a>
      ))}
    </div>
  )
}
