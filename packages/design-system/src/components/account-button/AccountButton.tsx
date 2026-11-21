import { type ComponentPropsWithoutRef, useId } from 'react'

import { classNames } from '../classNames'
import { RoundButton } from '../round-button/RoundButton'
import { glyphOf } from './glyphs'
import { screenNameInitials } from './initials'

export type AccountButtonProps = Omit<ComponentPropsWithoutRef<'a'>, 'aria-label' | 'children' | 'href'> & {
  /**
   * The screen name of the supporter who is logged in, or nothing when nobody is. With a name
   * the button goes to Mijn account and shows the initials; without one it goes to Inloggen.
   */
  screenName?: string | undefined
}

/** Where the button goes, and what it is called, without and with a screen name. */
export const accountButtonTargets = {
  signedIn: { href: '/fans/mijn-account', label: 'Mijn account' },
  signedOut: { href: '/fans/inloggen', label: 'Inloggen' },
} as const

/**
 * The account button of the header: a RoundButton on the header with a supporter in it, the
 * upper body with an egg-shaped head and a scarf. It is a link: without a `screenName` to
 * Inloggen, with the arms down and the scarf around the neck; with one to Mijn account, with
 * the arms up holding the scarf above the head and the initials on the chest. Under the mouse
 * and with the keyboard the arms come up and wave the scarf. The name of the link says where it
 * goes, "Inloggen" or "Mijn account". The supporter, initials included, is a drawing hidden
 * from assistive technology: the initials are lines (glyphs.ts), not text, so they are part of
 * the picture and not a label of the link. It has no state and no script, so it works without
 * JavaScript. account-button.css moves it.
 *
 * The shapes are cut out of the body with a mask, the scarf around the neck and the initials,
 * so they show the colour behind the button, also in forced colours.
 */
export const AccountButton = ({ className, screenName, ...props }: AccountButtonProps) => {
  const id = useId()
  const initials = [...(screenName === undefined ? '' : screenNameInitials(screenName))]
    .map((letter) => glyphOf(letter))
    .filter((glyph): glyph is string => glyph !== undefined)
  const signedIn = screenName !== undefined
  const target = signedIn ? accountButtonTargets.signedIn : accountButtonTargets.signedOut
  const bodyMask = `${id}-body`
  const scarfMask = `${id}-scarf`

  return (
    <RoundButton
      {...props}
      className={classNames('hf-account-button', className)}
      data-signed-in={signedIn ? '' : undefined}
      href={target.href}
      label={target.label}
      surface="header"
    >
      <svg
        aria-hidden="true"
        className="hf-account-button-fan"
        fill="currentColor"
        focusable="false"
        viewBox="0 0 32 32"
      >
        <defs>
          <mask height="32" id={bodyMask} maskUnits="userSpaceOnUse" width="32" x="0" y="0">
            <rect fill="white" height="32" width="32" />
            {/* The scarf around the neck: a loop and two ends that hang down, cut out. */}
            <g
              className="hf-account-button-neck"
              fill="none"
              stroke="black"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
            >
              <path d="M12.7 21.4c2 1.4 4.6 1.4 6.6 0" />
              <path d="M13.5 22.7v5.4l2 .3M18.5 22.7v5.4l-2 .3" />
            </g>
            {/* The initials on the chest: letters of 4 by 5, 1.2 apart. */}
            <g
              className="hf-account-button-initials"
              fill="none"
              stroke="black"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.1"
            >
              {initials.map((glyph, index) => (
                <path
                  d={glyph}
                  key={index}
                  transform={`translate(${16 - (initials.length * 5.2 - 1.2) / 2 + index * 5.2} 24.6)`}
                />
              ))}
            </g>
          </mask>
          <mask height="32" id={scarfMask} maskUnits="userSpaceOnUse" width="32" x="0" y="0">
            <rect fill="white" height="32" width="32" />
            {/* The stripes of the scarf above the head. */}
            <path d="M11.4 4.5h1.8v4h-1.8zM15.1 4.5h1.8v4h-1.8zM18.8 4.5h1.8v4h-1.8z" fill="black" />
          </mask>
        </defs>
        {/* The arms and the scarf above the head, which come up and wave. */}
        <g className="hf-account-button-wave">
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6">
            <path d="M10.4 22.4C8.6 19 7.6 14.4 8 9.4" />
            <path d="M21.6 22.4C23.4 19 24.4 14.4 24 9.4" />
          </g>
          <rect height="4" mask={`url(#${scarfMask})`} rx="1.3" width="21" x="5.5" y="4.5" />
          <path
            d="M6.3 9v2.3M7.8 9v1.7M24.2 9v1.7M25.7 9v2.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1"
          />
        </g>
        <g mask={`url(#${bodyMask})`}>
          {/* The head, an egg that is a little narrower at the chin. */}
          <path d="M16 8.5c2.5 0 4.1 2 4.1 4.6 0 2.8-1.9 5-4.1 5s-4.1-2.2-4.1-5c0-2.6 1.6-4.6 4.1-4.6z" />
          {/* The neck, short, that widens into the shoulders. */}
          <path d="M14.2 16.6h3.6v2.4c0 .9 1 1.6 2.5 2H11.7c1.5-.4 2.5-1.1 2.5-2z" />
          {/* The shoulders and the chest, with rounded corners, cut off by the edge. */}
          <path d="M7.4 32v-3.5c0-3.5 2.3-6.1 5.5-7.1l1.6-.5 1.5 1.1 1.5-1.1 1.6.5c3.2 1 5.5 3.6 5.5 7.1V32z" />
        </g>
      </svg>
    </RoundButton>
  )
}
