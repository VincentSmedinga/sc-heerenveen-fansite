import { type ReactNode, useId } from 'react'

import { classNames } from '../classNames'
import { Text } from '../text/Text'

/** The four numbers of a prediction, in the order a keyboard visits them: row by row. */
export const scoreFields = ['halftimeHome', 'halftimeAway', 'fullTimeHome', 'fullTimeAway'] as const

export type ScoreField = (typeof scoreFields)[number]

export type ScoreGridProps = {
  /** The name of the away club, the head of the right column. */
  awayName: string
  className?: string
  /** The value each field starts with, for a form that the browser keeps. Empty if left out. */
  defaultValues?: ScoreGridValues
  /** What is wrong with the grid as a whole, such as "Vul alle vier de cijfers in." */
  error?: string | undefined
  /** What is wrong with a field. It shows above the grid in text, and the field is invalid. */
  errors?: ScoreGridValues
  /** The name of the home club, the head of the left column. The home club comes first. */
  homeName: string
  /**
   * The `id` of each field, so a link in an ErrorSummary can bring the focus to it. A field
   * left out has none.
   */
  ids?: ScoreGridValues
  /**
   * The text of the legend of the fieldset, such as "Jouw voorspelling". The page gives it, so
   * it says what the grid is for.
   */
  legend: string
  /** The `name` of each field in the form. By default the name of the field, `halftimeHome`. */
  names?: ScoreGridValues
  /** Called with the field and its new value, only for a grid with `values`. */
  onValueChange?: (field: ScoreField, value: string) => void
  /** Shows the four numbers without fields, for a prediction that is closed. */
  readOnly?: boolean
  /** The value each field has, for a page that keeps the numbers. A field left out is empty. */
  values?: ScoreGridValues
}

/** A value, or an error text, for each of the four fields. A field left out has none. */
export type ScoreGridValues = Partial<Record<ScoreField, string>>

const rows = [
  { away: 'halftimeAway', home: 'halftimeHome', label: 'Ruststand' },
  { away: 'fullTimeAway', home: 'fullTimeHome', label: 'Eindstand' },
] as const

/**
 * Where a supporter types the half-time and the full-time score of a game: one fieldset with a
 * legend, and a grid of four columns. The first row has the names of the clubs, home first. The
 * other two rows are "Ruststand" and "Eindstand", each with a field for one digit for the home
 * club, a dash and a field for the away club. Each field is named from the labels of its row
 * and its column that are in sight, not from a second text. A field is a plain text field for
 * one digit, so the grid works without JavaScript in a plain form, and a field left empty is
 * sent empty, never as 0. A field with an error looks like any invalid field, and the text of
 * the error is above the grid. `readOnly` shows the same four numbers and labels without
 * fields. score-grid.css gives it its look.
 */
export const ScoreGrid = ({
  awayName,
  className,
  defaultValues,
  error,
  errors = {},
  homeName,
  ids = {},
  legend,
  names = {},
  onValueChange,
  readOnly = false,
  values,
}: ScoreGridProps) => {
  const id = useId()
  const gridErrorId = `${id}-error`
  const homeId = `${id}-home`
  const awayId = `${id}-away`
  const fieldErrors = scoreFields.filter((field) => errors[field])
  const hasText = Boolean(error) || fieldErrors.length > 0
  const labelOf = (row: (typeof rows)[number]) => `${id}-${row.label}`
  const nameOf = (field: ScoreField) => names[field] ?? field

  return (
    <fieldset aria-describedby={error ? gridErrorId : undefined} className={classNames('hf-score-grid', className)}>
      <legend className="hf-score-grid-legend">{legend}</legend>
      {hasText ? (
        <div className="hf-score-grid-errors">
          {error ? (
            <Text className="hf-field-error" id={gridErrorId}>
              <span className="hf-visually-hidden">Fout:</span> {error}
            </Text>
          ) : null}
          {fieldErrors.map((field) => (
            <Text className="hf-field-error" id={`${id}-${field}-error`} key={field}>
              <span className="hf-visually-hidden">Fout:</span> {errors[field]}
            </Text>
          ))}
        </div>
      ) : null}
      <div className="hf-score-grid-grid">
        <span aria-hidden="true" />
        <span className="hf-score-grid-club" id={homeId}>
          {homeName}
        </span>
        <span aria-hidden="true" />
        <span className="hf-score-grid-club" id={awayId}>
          {awayName}
        </span>
        {rows.map((row) => {
          const cell = (field: ScoreField, clubId: string, club: string) => {
            const value = values ? (values[field] ?? '') : undefined
            const fieldError = errors[field]

            if (readOnly) {
              const shown = values?.[field] ?? defaultValues?.[field] ?? ''

              return (
                <span className="hf-score-grid-value" data-empty={shown === '' ? '' : undefined}>
                  <span className="hf-visually-hidden">
                    {row.label}, {club}:{' '}
                  </span>
                  {shown === '' ? '–' : shown}
                </span>
              )
            }

            return (
              <input
                aria-describedby={
                  [fieldError ? `${id}-${field}-error` : undefined, error ? gridErrorId : undefined]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                aria-invalid={fieldError ? true : undefined}
                aria-labelledby={`${labelOf(row)} ${clubId}`}
                autoComplete="off"
                className="hf-score-grid-field"
                defaultValue={values ? undefined : defaultValues?.[field]}
                id={ids[field]}
                inputMode="numeric"
                maxLength={1}
                name={nameOf(field)}
                pattern="[0-9]"
                spellCheck={false}
                type="text"
                {...(values ? { onChange: (event) => onValueChange?.(field, event.currentTarget.value), value } : {})}
              />
            )
          }

          return (
            <ScoreRow key={row.label} label={row.label} labelId={labelOf(row)}>
              {cell(row.home, homeId, homeName)}
              <span aria-hidden="true" className="hf-score-grid-dash">
                –
              </span>
              {cell(row.away, awayId, awayName)}
            </ScoreRow>
          )
        })}
      </div>
    </fieldset>
  )
}

/** A row of the grid: its label, and its four cells, which sit straight in the grid. */
const ScoreRow = ({ children, label, labelId }: { children: ReactNode; label: string; labelId: string }) => (
  <>
    <span className="hf-score-grid-label" id={labelId}>
      {label}
    </span>
    {children}
  </>
)
