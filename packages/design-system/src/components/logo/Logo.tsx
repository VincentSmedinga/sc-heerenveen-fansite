import type { ComponentPropsWithoutRef } from 'react'

import { useId } from 'react'

import { classNames } from '../classNames'
import { Pompebled } from './Pompebled'

/*
 * The artwork keeps its own colours in both themes, like the SVG files in src/assets, which the shield is
 * copied from: blue-500, blue-700 and red-600 of the palette, and white. The text beside it takes its colour
 * from the tokens, so it follows the theme, and the header.
 */
const shieldPath =
  'M96,24A160,160 0 0,0 39.58,45.52A16,16 0 0,0 32,59.12A124.61,124.61 0 0,0 96,168A124.61,124.61 0 0,0 160,59.12A16,16 0 0,0 152.42,45.52A160,160 0 0,0 96,24Z'

export type LogoProps = Omit<ComponentPropsWithoutRef<'span'>, 'aria-label' | 'children' | 'role'>

/**
 * The logo of the Fansite: the shield with the Frisian bands and a pompeblêd, the wordmark and "sinds 1997".
 * The wordmark is text in the Truculenta of the type style, so it takes the colour of the theme.
 * The whole logo is one image with the name "sc Heerenveen Fansite, sinds 1997".
 */
export const Logo = ({ className, ...props }: LogoProps) => {
  // Every logo on a page needs ids of its own for the shield and the clipping path.
  const id = useId()
  const shield = `${id}-shield`
  const field = `${id}-field`

  return (
    <span
      {...props}
      aria-label="sc Heerenveen Fansite, sinds 1997"
      className={classNames('hf-logo', className)}
      role="img"
    >
      <svg aria-hidden="true" className="hf-logo-mark" focusable="false" viewBox="0 0 192 192">
        <defs>
          <path d={shieldPath} id={shield} />
          <clipPath id={field}>
            <use href={`#${shield}`} />
          </clipPath>
        </defs>
        <use fill="none" href={`#${shield}`} stroke="#fff" strokeWidth={20} />
        <g clipPath={`url(#${field})`}>
          <rect fill="#fff" height={192} width={192} />
          <path d="M0,0H192V104.22L0,8.22Z" fill="#3575c4" />
          <path d="M0,79.78L192,175.78V192H0Z" fill="#3575c4" />
          <use fill="none" href={`#${shield}`} stroke="#fff" strokeWidth={20} />
        </g>
        <use fill="none" href={`#${shield}`} stroke="#07458e" strokeWidth={12} />
        <g transform="translate(95.27 93.05) scale(1.92)">
          <Pompebled fill="#c22826" />
        </g>
      </svg>
      <span className="hf-logo-text">
        <span className="hf-logo-wordmark hf-wordmark">sc Heerenveen Fansite</span>{' '}
        <span className="hf-logo-tagline">sinds 1997</span>
      </span>
    </span>
  )
}
