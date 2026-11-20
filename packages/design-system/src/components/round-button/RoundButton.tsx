import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { type Size, sizeClassName } from '../size'

/** The surfaces a RoundButton is made for: the dark blue of the header, or the page. */
export const roundButtonSurfaces = ['page', 'header'] as const

export type RoundButtonProps = RoundButtonAsButton | RoundButtonAsLink

export type RoundButtonSurface = (typeof roundButtonSurfaces)[number]

type RoundButtonAsButton = Omit<ComponentPropsWithoutRef<'button'>, 'aria-label' | 'children' | 'type'> &
  RoundButtonOwnProps & {
    /** Without `href` the RoundButton is a button that does not send a form. */
    href?: undefined
  }

type RoundButtonAsLink = Omit<ComponentPropsWithoutRef<'a'>, 'aria-label' | 'children' | 'href'> &
  RoundButtonOwnProps & {
    /** With `href` the RoundButton is a link to that address. */
    href: string
  }

type RoundButtonOwnProps = {
  /** The icon, which is all the button shows. It is hidden from assistive technology. */
  children: ReactNode
  /**
   * The name of the button for a screen reader, such as "Naar boven". There is no visible
   * text, so the name is what a visitor hears. It says what the button does.
   */
  label: string
  /** `default` is the standard size. `small` is a smaller button, for a crowded header. */
  size?: Size
  /**
   * `page` takes the colours of a link on the page; `header` those of the dark blue of the
   * header, which is the same in both themes.
   */
  surface?: RoundButtonSurface
}

/**
 * A round button or link with only an icon, for the header and for the page: the base of the
 * ThemeButton, the Page.TopLink and the AccountButton, so the three look the same. At rest it
 * is only the icon, in a quiet blue; under the mouse, pressed and with the keyboard it comes
 * forward with a light fill and a rim. With `href` it is a link, without it a button. The
 * `label` is its name. round-button.css gives it its look.
 */
export const RoundButton = (props: RoundButtonProps) => {
  if (props.href === undefined) {
    const { children, className, label, size = 'default', surface = 'page', ...rest } = props

    return (
      <button
        {...rest}
        aria-label={label}
        className={classNames('hf-round-button', `hf-round-button-${surface}`, sizeClassName(size), className)}
        type="button"
      >
        {children}
      </button>
    )
  }

  const { children, className, label, size = 'default', surface = 'page', ...rest } = props

  return (
    <a
      {...rest}
      aria-label={label}
      className={classNames('hf-round-button', `hf-round-button-${surface}`, sizeClassName(size), className)}
    >
      {children}
    </a>
  )
}
