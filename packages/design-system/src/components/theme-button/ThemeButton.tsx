'use client'

import { type ComponentPropsWithoutRef, useId, useState } from 'react'

import { classNames } from '../classNames'
import { type Size, sizeClassName } from '../size'

export type ThemeButtonProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'aria-label' | 'aria-pressed' | 'children' | 'type'
> & {
  /** Whether the page is dark now: the button is pressed then, and draws a moon, not a sun. */
  dark: boolean
  /**
   * The name of the button for a screen reader, such as "Donker". There is no visible text, so
   * the name is what a visitor hears, together with whether the button is pressed.
   */
  label: string
  /** `default` is the standard size. `small` is a smaller button, for a crowded header. */
  size?: Size
}

/**
 * The button that switches between the light and the dark theme, for the header: a toggle
 * button with a filled sun while the page is light and a filled moon while it is dark, so the
 * shape shows the theme that is on. It is named `label` and is pressed (`aria-pressed`) in the
 * dark theme. Under the mouse and with the keyboard focus the sun turns into the moon and the
 * moon into the sun, to show which theme a click chooses; after a click it shows the theme that
 * was chosen until the pointer or the focus leaves. The icon is a circle that grows into the
 * moon while a second circle cuts the dent out of it, and the rays of the sun; they are drawn
 * here, because Icon draws only one icon and does not change. It holds no theme: the page gives
 * it `dark` and handles the click, and the button only remembers that it was clicked
 * (`data-settled`).
 * theme-button.css gives it its look, which is made for the dark blue of the header.
 */
export const ThemeButton = ({
  className,
  dark,
  label,
  onBlur,
  onClick,
  onPointerLeave,
  size = 'default',
  ...props
}: ThemeButtonProps) => {
  const [settled, setSettled] = useState(false)
  const maskId = useId()

  return (
    <button
      {...props}
      aria-label={label}
      aria-pressed={dark}
      className={classNames('hf-theme-button', sizeClassName(size), className)}
      data-settled={settled ? '' : undefined}
      onBlur={(event) => {
        setSettled(false)
        onBlur?.(event)
      }}
      onClick={(event) => {
        setSettled(true)
        onClick?.(event)
      }}
      onPointerLeave={(event) => {
        setSettled(false)
        onPointerLeave?.(event)
      }}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="hf-icon"
        fill="currentColor"
        focusable="false"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 16 16"
      >
        <defs>
          <mask height="24" id={maskId} maskUnits="userSpaceOnUse" width="24" x="-4" y="-4">
            <rect fill="white" height="24" stroke="none" width="24" x="-4" y="-4" />
            <circle className="hf-theme-button-dent" cx="11.696" cy="4.304" fill="black" r="4.75" stroke="none" />
          </mask>
        </defs>
        <g className="hf-theme-button-rays">
          <path d="M8 1.5v1" />
          <path d="M8 13.5v1" />
          <path d="M1.5 8h1" />
          <path d="M13.5 8h1" />
          <path d="m3.4 3.4.7.7" />
          <path d="m11.9 11.9.7.7" />
          <path d="m12.6 3.4-.7.7" />
          <path d="m4.1 11.9-.7.7" />
        </g>
        <g mask={`url(#${maskId})`}>
          <circle className="hf-theme-button-body" cx="8" cy="8" r="6.25" stroke="none" />
        </g>
      </svg>
    </button>
  )
}
