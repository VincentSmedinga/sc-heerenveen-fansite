import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { Text } from '../text/Text'

export type PickListGroup = {
  /** How many are chosen in this group, such as 1. It is data: the component counts nothing. */
  chosen: number
  /**
   * What is wrong with the group, and how to put it right. Without it, the group has no error.
   * It is text under the legend, and the group points to it with `aria-describedby`.
   */
  error?: string | undefined
  /**
   * The `id` of the group. It is the `id` of the first checkbox, so a link in an ErrorSummary
   * goes to it; the others get a number after it.
   */
  id: string
  /** The name of the group, such as "Middenvelders". */
  legend: ReactNode
  /** How many may be chosen in this group, such as 2. */
  maximum: number
  /** The name the form sends each checked value under. */
  name: string
  /** The checkboxes, in the order shown. */
  options: readonly PickListOption[]
  /** The values that are checked when the page opens. Without it nothing is checked. */
  value?: readonly string[] | undefined
}

export type PickListOption = {
  /** Whether the player cannot be chosen. The checkbox is disabled; give the `reason` too. */
  disabled?: boolean
  /** The name of the player, which a screen reader reads as the label of the checkbox. */
  label: string
  /** A short line behind the name, such as "31 punten · nog 3 keer". It arrives as data. */
  line?: string | undefined
  /**
   * Why the player cannot be chosen, such as "Al 10 keer gekozen". The checkbox points to it,
   * so a screen reader reads it with the name.
   */
  reason?: string | undefined
  /** What the form sends for it when it is checked, such as an id of a player. */
  value: string
}

export type PickListProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The groups, in the order shown: for example one for each line of a team. */
  groups: readonly PickListGroup[]
}

export type PickListStripPlace = {
  /** The surname to show. Without it the place is empty and shows only its number. */
  name?: string | undefined
  /**
   * Text that says the player does not count, such as "telt niet mee". The name is struck
   * through and this text stands under it, so the strike-through is not the only sign.
   */
  note?: string | undefined
}

export type PickListStripProps = Omit<ComponentPropsWithoutRef<'ol'>, 'children'> & {
  /** The places, in order. They are numbered from 1. */
  places: readonly PickListStripPlace[]
}

/**
 * The strip of the chosen players: a place for each, side by side, also on a phone. A place is
 * a dark tile with its number and the surname. An empty place shows only its number. A player
 * who does not count has a struck-through name and a note. pick-list.css gives it its look.
 */
const Strip = ({ className, places, ...props }: PickListStripProps) => (
  <ol {...props} className={classNames('hf-pick-list-strip', className)}>
    {places.map((place, index) => (
      <li data-empty={place.name ? undefined : ''} key={index}>
        <span className="hf-pick-list-strip-number">{index + 1}</span>
        {place.name ? (
          <span className="hf-pick-list-strip-name" data-struck={place.note ? '' : undefined}>
            {place.name}
          </span>
        ) : null}
        {place.note ? <span className="hf-pick-list-strip-note">{place.note}</span> : null}
      </li>
    ))}
  </ol>
)

Strip.displayName = 'PickList.Strip'

/**
 * A group of checkboxes for each line of a team, to tick players: one `fieldset` with a
 * `legend` for each group. Behind the legend stands a counter such as "1 van 2", as text
 * that is part of the legend, so a screen reader says "Middenvelders, 1 van 2". Each player
 * is a row with a checkbox, a name and a short line; the whole row can be tapped. A player
 * who cannot be chosen is grey, has a disabled checkbox and a reason the checkbox points to.
 * A group with an error shows the text of the error under the legend and the counter in the
 * colour of errors; the colour is never the only sign. It works without JavaScript: the
 * boxes are ordinary checkboxes in a form, and nothing is blocked, because the server
 * decides. It counts and checks nothing. pick-list.css gives it its look.
 */
export const PickList = ({ className, groups, ...props }: PickListProps) => (
  <div {...props} className={classNames('hf-pick-list', className)}>
    {groups.map((group) => {
      const errorId = `${group.id}-error`
      const checked = group.value ?? []

      return (
        <fieldset
          aria-describedby={group.error ? errorId : undefined}
          className="hf-pick-list-group"
          data-invalid={group.error ? '' : undefined}
          key={group.id}
        >
          <legend>
            {group.legend}
            <span className="hf-visually-hidden">,</span>{' '}
            <span className="hf-meta hf-pick-list-count">
              {group.chosen} van {group.maximum}
            </span>
          </legend>
          {group.error ? (
            <Text className="hf-field-error" id={errorId}>
              <span className="hf-visually-hidden">Fout:</span> {group.error}
            </Text>
          ) : null}
          <div className="hf-pick-list-rows">
            {group.options.map((option, index) => {
              const inputId = index === 0 ? group.id : `${group.id}-${index + 1}`
              const reasonId = `${inputId}-reason`

              return (
                <label className="hf-pick-list-row" data-disabled={option.disabled ? '' : undefined} key={option.value}>
                  <input
                    aria-describedby={option.reason ? reasonId : undefined}
                    defaultChecked={checked.includes(option.value)}
                    disabled={option.disabled}
                    id={inputId}
                    name={group.name}
                    type="checkbox"
                    value={option.value}
                  />
                  <span className="hf-pick-list-text">
                    <span className="hf-pick-list-name">{option.label}</span>
                    {option.reason ? (
                      <span className="hf-meta hf-pick-list-line" id={reasonId}>
                        {option.reason}
                      </span>
                    ) : option.line ? (
                      <span className="hf-meta hf-pick-list-line">{option.line}</span>
                    ) : null}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )
    })}
  </div>
)

PickList.Strip = Strip
