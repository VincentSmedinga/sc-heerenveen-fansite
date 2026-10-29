'use client'

import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  useId,
  useRef,
  useSyncExternalStore,
} from 'react'

import { Button } from '../button/Button'
import { classNames } from '../classNames'
import { Select } from '../select/Select'
import { Text } from '../text/Text'

export type SeasonPickerOption = {
  /** What the choice says, such as `2025/26`. */
  label: string
  /** What the form sends for it, such as `2025-26`. */
  value: string
}

export type SeasonPickerProps = Omit<
  ComponentPropsWithoutRef<'form'>,
  'action' | 'aria-label' | 'aria-labelledby' | 'children' | 'method' | 'onChange'
> & {
  /** Where the form goes: a route that sends the visitor on to the page of the season. */
  action: string
  /** The seasons to choose from, in the order they are shown. */
  options: readonly SeasonPickerOption[]
  /** The value of the season the page shows. */
  value: string
}

const subscribeToNothing = () => () => undefined

/** The keys that change the choice of a closed list without opening it. */
const choosingKeys = new Set(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'])

/**
 * Whether a key press changes the choice of a closed list: the arrows, Home, End, Page up and
 * Page down, and a letter or digit, which jumps to the choice that starts with it. A key with
 * Alt, Control or Command is a shortcut, and the space bar opens the list.
 */
export const choosesByKey = ({
  altKey,
  ctrlKey,
  key,
  metaKey,
}: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey'>) =>
  !altKey && !ctrlKey && !metaKey && (choosingKeys.has(key) || (key.length === 1 && key !== ' '))

/**
 * A form that chooses the season a page shows: a list with the seasons and a button "Toon". It
 * is a form with `method="get"`, so it works without JavaScript: the button sends the choice to
 * `action`, which sends the visitor on to the address of that season.
 *
 * With JavaScript the button is gone and a choice sends the form at once. That reloads the
 * page, which is a change of context (WCAG 3.2.2), so the visitor is told before they
 * choose: the list is described by a line that a screen reader reads with it. With script the
 * label and the line are visually hidden: next to the title "Wedstrijden 2025/26" the list
 * says what it is, and the page stays quiet. Without script the label stays, with the button.
 * A keyboard must be able to reach every season without the page jumping
 * at each press, and some browsers send `change` at each arrow key on a closed list. So a
 * choice made with a key waits for Enter, and a choice made with the mouse, a finger or the
 * open list sends at once. A choice that is not confirmed is put back when the list loses the
 * focus, so the list never shows a season the page does not.
 */
export const SeasonPicker = ({ action, className, options, value, ...props }: SeasonPickerProps) => {
  const id = useId()
  const hintId = `${id}-hint`
  // Whether script runs: only then the button and the label are hidden and the line is there.
  // The server and the first render of the browser say no, so the page is the same for both.
  const scripted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
  // Whether the list is changing by a key that is held down now.
  const byKey = useRef(false)

  const choose = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!byKey.current) {
      event.currentTarget.form?.requestSubmit()
    }
  }

  const confirm = (event: KeyboardEvent<HTMLSelectElement>) => {
    const list = event.currentTarget

    if (event.key === 'Enter') {
      // Enter on a list that still shows the season of the page has nothing to confirm.
      if (list.value !== value) {
        event.preventDefault()
        list.form?.requestSubmit()
      }
    } else if (choosesByKey(event)) {
      byKey.current = true
    }
  }

  return (
    <>
      <form
        {...props}
        action={action}
        aria-label="Seizoen kiezen"
        autoComplete="off"
        className={classNames('hf-season-picker', className)}
        method="get"
      >
        <div className="hf-season-picker-row">
          <div className="hf-season-picker-field">
            <label className={scripted ? 'hf-visually-hidden' : undefined} htmlFor={id}>
              Seizoen
            </label>
            <Select
              aria-describedby={scripted ? hintId : undefined}
              defaultValue={value}
              id={id}
              key={value}
              name="seizoen"
              onBlur={(event) => {
                byKey.current = false
                event.currentTarget.value = value
              }}
              onChange={choose}
              onKeyDown={confirm}
              onKeyUp={() => {
                byKey.current = false
              }}
              onPointerDown={() => {
                byKey.current = false
              }}
            >
              {options.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </div>
          <Button hidden={scripted} type="submit">
            Toon
          </Button>
        </div>
      </form>
      {scripted && (
        <Text appearance="meta" className="hf-visually-hidden" id={hintId}>
          De pagina wisselt direct van seizoen. Kies met de pijltjes en bevestig met Enter.
        </Text>
      )}
    </>
  )
}
