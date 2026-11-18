import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type CupProps = Omit<ComponentPropsWithoutRef<'svg'>, 'aria-hidden' | 'children' | 'focusable' | 'viewBox'>

/**
 * A line drawing of the Denneappel, the cup of the KNVB Beker, upright: the pine cone on the
 * lid with its garlands, the shoulder that widens into a broad band of plates for the names,
 * the leaves on the belly, and the short stem on a foot and a plinth. It is for a card that
 * celebrates a won cup. It is decoration: it is hidden from a screen reader, so the text next
 * to it says what it stands for. The lines take the colour of the text around it.
 */
export const Cup = ({ className, ...props }: CupProps) => (
  <svg
    {...props}
    aria-hidden="true"
    className={classNames('hf-cup', className)}
    fill="none"
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={3}
    viewBox="0 0 96 192"
  >
    <ellipse cx={48} cy={23} rx={7} ry={11} />
    <path d="M42 17L54 29M42 25L50 33M54 17L42 29M54 25L46 33" />
    <path d="M32 52C32 42 38 36 48 36C58 36 64 42 64 52" />
    <path d="M30 52H66M32 56H64M34 56V70M62 56V70" />
    <path d="M33 60C36 74 44 74 48 66C52 74 60 74 63 60" />
    <path d="M32 62C28 70 30 78 34 84M64 62C68 70 66 78 62 84" />
    <path d="M34 70C32 78 30 80 30 82M62 70C64 78 66 80 66 82" />
    <path d="M30 82C28 92 14 96 8 100M66 82C68 92 82 96 88 100" />
    <path d="M8 100H88V122H8Z" />
    <path d="M20 100V122M34 100V122M62 100V122M76 100V122" />
    <rect height={14} rx={1} width={22} x={37} y={104} />
    <path d="M10 122C12 138 28 148 38 152M86 122C84 138 68 148 58 152" />
    <path d="M28 126C24 134 28 142 34 146C36 138 34 130 28 126ZM68 126C72 134 68 142 62 146C60 138 62 130 68 126ZM48 126C43 134 44 142 48 148C52 142 53 134 48 126Z" />
    <path d="M38 152H58" />
    <path d="M40 152C34 156 36 162 42 164H54C60 162 62 156 56 152" />
    <path d="M42 164V168M54 164V168" />
    <path d="M42 168C40 174 34 176 30 178H66C62 176 56 174 54 168" />
    <path d="M28 178H68V182H28Z" />
    <path d="M14 182H82V190H14Z" />
  </svg>
)
