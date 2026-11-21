'use client'

import { type ChangeEvent, type ComponentPropsWithoutRef, useState } from 'react'

import { classNames } from '../classNames'

/** How many digits a code has. */
export const codeLength = 6

export type CodeInputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'inputMode' | 'maxLength' | 'size' | 'type' | 'value'
>

const boxes = Array.from({ length: codeLength }, (_, index) => index)

/**
 * The field for the six digits of a code from a mail, drawn as six boxes. It is one text field,
 * so a screen reader hears one field with one label, pasting "482 190" or taking the code the
 * keyboard suggests fills every box, and without JavaScript it is still a field that takes the
 * code. The boxes are only drawing; the box that is next is marked. Put it in a Field, which
 * gives it its label, hint and error. With JavaScript the field keeps only the digits, at most
 * six; the receiver of the form must accept spaces too, for the same reason.
 */
export const CodeInput = ({ className, onBlur, onChange, onFocus, ...props }: CodeInputProps) => {
  const [filled, setFilled] = useState(0)
  const [focused, setFocused] = useState(false)

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.currentTarget.value.replaceAll(/\D/g, '').slice(0, codeLength)

    if (digits !== event.currentTarget.value) {
      event.currentTarget.value = digits
    }

    setFilled(digits.length)
    onChange?.(event)
  }

  return (
    <span className={classNames('hf-code-input', className)}>
      <span aria-hidden="true" className="hf-code-input-boxes">
        {boxes.map((index) => (
          <span
            className="hf-code-input-box"
            data-current={focused && index === Math.min(filled, codeLength - 1) ? '' : undefined}
            key={index}
          />
        ))}
      </span>
      <input
        autoCapitalize="off"
        autoComplete="one-time-code"
        autoCorrect="off"
        inputMode="numeric"
        spellCheck={false}
        type="text"
        {...props}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        onChange={change}
        onFocus={(event) => {
          setFilled(event.currentTarget.value.replaceAll(/\D/g, '').length)
          setFocused(true)
          onFocus?.(event)
        }}
      />
    </span>
  )
}
