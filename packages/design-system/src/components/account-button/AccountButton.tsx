import { type ComponentPropsWithoutRef, useId } from 'react'

import { classNames } from '../classNames'
import { RoundButton } from '../round-button/RoundButton'
import { glyphOf } from './glyphs'
import { screenNameInitials } from './initials'

export type AccountButtonProps = Omit<ComponentPropsWithoutRef<'a'>, 'aria-label' | 'children' | 'href'> & {
  /**
   * The screen name of the fan who is logged in, or nothing when nobody is. With a name the
   * button goes to Mijn account and shows the initials; without one it goes to Inloggen.
   */
  screenName?: string | undefined
}

/** Where the button goes, and what it is called, without and with a screen name. */
export const accountButtonTargets = {
  signedIn: { href: '/fans/mijn-account', label: 'Mijn account' },
  signedOut: { href: '/fans/inloggen', label: 'Inloggen' },
} as const

/** A glyph is 4 wide in its own units, drawn at 0.7: 2.8 wide, with 0.8 to the next one. */
const glyphScale = 0.7
const glyphStep = 3.6
const glyphGap = 0.8

/** The left edge of initial `index` of `count`, so that together they are centred on x 8. */
const initialX = (index: number, count: number): number =>
  Math.round((8 - (count * glyphStep - glyphGap) / 2 + index * glyphStep) * 100) / 100

/**
 * The account button of the header: a RoundButton on the header with a ring that holds a head
 * and shoulders, on the grid of 16 by 16 of the icons. It is a link: without a `screenName` to
 * Inloggen, with the head and shoulders; with one to Mijn account, with the torso moved up so
 * that it fills the ring as a disc, and the initials cut out of it. Logged out the torso rises
 * under the mouse and with the keyboard, to show where the click leads. A change between logged
 * out and logged in shows at once. The name of the link says where it goes, "Inloggen" or "Mijn
 * account". The drawing, initials included, is hidden from assistive technology: the initials
 * are lines (glyphs.ts), not text, so they are part of the picture and not a label of the link.
 * It has no state and no script, so it works without JavaScript. account-button.css moves it.
 *
 * The initials are cut out with a mask, so they show the colour behind the button, also in
 * forced colours.
 */
export const AccountButton = ({ className, screenName, ...props }: AccountButtonProps) => {
  const id = useId()
  const initials = [...(screenName === undefined ? '' : screenNameInitials(screenName))]
    .map((letter) => glyphOf(letter))
    .filter((glyph): glyph is string => glyph !== undefined)
  const signedIn = screenName !== undefined
  const target = signedIn ? accountButtonTargets.signedIn : accountButtonTargets.signedOut
  const ringClip = `${id}-ring`
  const initialsMask = `${id}-initials`

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
        className="hf-icon"
        fill="none"
        focusable="false"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 16 16"
      >
        <defs>
          <clipPath id={ringClip}>
            <circle cx="8" cy="8" r="5.75" />
          </clipPath>
          <mask height="16" id={initialsMask} maskUnits="userSpaceOnUse" width="16" x="0" y="0">
            <rect fill="white" height="16" stroke="none" width="16" />
            <g className="hf-account-button-initials" stroke="black" strokeWidth="1.3">
              {initials.map((glyph, index) => (
                <path
                  d={glyph}
                  key={index}
                  transform={`translate(${initialX(index, initials.length)} 6.25) scale(${glyphScale})`}
                />
              ))}
            </g>
          </mask>
        </defs>
        {/* The ring. */}
        <circle cx="8" cy="8" r="5.75" />
        <g mask={`url(#${initialsMask})`}>
          {/* The head. */}
          <circle cx="8" cy="6.4" fill="currentColor" r="1.75" />
          {/* The clip path is on this group, so it stays where it is when the torso moves. */}
          <g clipPath={`url(#${ringClip})`}>
            {/*
             * The torso, as large as the ring and far below it, so only the shoulders show.
             * The key makes a new element when someone logs in or out, which has nothing to
             * move from: the change shows at once, also while a page loads.
             */}
            <circle
              className="hf-account-button-torso"
              cx="8"
              cy="15.5"
              fill="currentColor"
              key={signedIn ? 'signed-in' : 'signed-out'}
              r="5.75"
              stroke="none"
            />
          </g>
        </g>
      </svg>
    </RoundButton>
  )
}
