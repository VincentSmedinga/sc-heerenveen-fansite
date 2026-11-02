import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { Button } from '../button/Button'
import { classNames } from '../classNames'
import { Field, type FieldProps } from '../field/Field'

/** A button that sends the form: its `name` and `value` tell the server which was pressed. */
export type InputTableButton = {
  name: string
  value?: string
}

export type InputTableColumn = {
  /**
   * Leaves "niet verplicht" out of the header and the labels of a column that is not required,
   * as `hideOptional` does in a Field. The fields keep their `required`.
   */
  hideOptional?: boolean
  /** The header of the column, shown above the fields and the visible label of each field. */
  name: string
  /**
   * Whether the fields of the column have to be filled in, as in a Field. Without it, they do.
   * A column that is not required says so in its header, in words: "niet verplicht". The header
   * is the label the eye sees where the table has room, so the status is there too.
   */
  required?: boolean
  /** `narrow` is for a short answer, such as a minute: the column takes less room. */
  width?: 'default' | 'narrow'
}

export type InputTableField = {
  /** The field: an Input, a Textarea or a Select. */
  control: FieldProps['children']
  /** What is wrong with the answer. Without it, the field has no error. */
  error?: string | undefined
  /** The `id` of the field. An ErrorSummary links to it, so it must be unique on the page. */
  id: string
}

export type InputTableProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The button under the table that adds a row: a submit button, so it works without
   * JavaScript. `label` is its text, such as `Doelpunt toevoegen`.
   */
  add: InputTableButton & { label: string }
  /**
   * The text of the caption, which names the table, such as `Doelpunten`. Only a screen reader
   * gets it: the caption is not shown, so put a heading above the table.
   */
  caption: string
  /** A table has no children: everything it shows comes from the props. */
  children?: never
  /** The columns, from the left. The row header and the remove button are extra columns. */
  columns: readonly InputTableColumn[]
  /**
   * What is shown instead of the table when it has no rows yet, such as a line of text. The
   * button to add a row stays.
   */
  empty?: ReactNode
  /**
   * The text of the button that removes a row. A screen reader hears the name of the row after
   * it: `Weghalen doelpunt 2`. Without it, it is `Weghalen`.
   */
  removeLabel?: string
  /** The rows, from the top. */
  rows: readonly InputTableRow[]
}

export type InputTableRow = {
  /** The fields of the row, one for each column, in the order of the columns. */
  fields: readonly InputTableField[]
  /** What the row is called, such as `Doelpunt 2`. It is the row header and must be unique. */
  header: string
  /** The button that removes the row: a submit button. */
  remove: InputTableButton
}

// The name of a row in the middle of a sentence: "Doelpunt 2" becomes "doelpunt 2".
const lowerFirst = (name: string) => name.charAt(0).toLowerCase() + name.slice(1)

/**
 * A table of rows of fields, for a list in which the editor fills in the same things again and
 * again, such as the goals of a match. The headers of the columns are the visible labels, so a
 * field has no label of its own to see. Every field still has a label for a screen reader that
 * says which row it belongs to: `Minuut, doelpunt 2`. The header of a row is its name. Every
 * row has a button to remove it, and under the table a button adds a row. Both are submit
 * buttons, so the table works without JavaScript: the server answers with the form again, with
 * the row added or removed. Put it in a Form.
 *
 * Where the table does not fit, which is on a phone, every row is a block with all the labels
 * in view (input-table.css), so nothing scrolls sideways. A page that wants the table in one
 * piece gives it room with a wide Page.Main.
 */
export const InputTable = ({
  add,
  caption,
  className,
  columns,
  empty,
  removeLabel = 'Weghalen',
  rows,
  ...props
}: InputTableProps) => (
  <div {...props} className={classNames('hf-input-table', className)}>
    {rows.length === 0 ? (
      empty
    ) : (
      <table>
        <caption className="hf-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th className="hf-input-table-name" scope="col">
              <span className="hf-visually-hidden">Rij</span>
            </th>
            {columns.map((column) => (
              <th
                className={column.width === 'narrow' ? 'hf-input-table-narrow' : undefined}
                key={column.name}
                scope="col"
              >
                {column.name}
                {column.required === false && column.hideOptional !== true ? (
                  <>
                    {' '}
                    <span className="hf-field-status hf-input-table-status">(niet verplicht)</span>
                  </>
                ) : null}
              </th>
            ))}
            <th className="hf-input-table-action" scope="col">
              <span className="hf-visually-hidden">{removeLabel}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.header}>
              <th scope="row">{row.header}</th>
              {row.fields.map((field, index) => (
                <td key={field.id}>
                  <Field
                    className="hf-input-table-field"
                    error={field.error}
                    hideOptional={columns[index]?.hideOptional === true}
                    id={field.id}
                    label={
                      <>
                        {columns[index]?.name}
                        <span className="hf-visually-hidden">, {lowerFirst(row.header)}</span>
                      </>
                    }
                    required={columns[index]?.required ?? true}
                  >
                    {field.control}
                  </Field>
                </td>
              ))}
              <td className="hf-input-table-action">
                <Button appearance="soft" name={row.remove.name} type="submit" value={row.remove.value}>
                  {removeLabel} <span className="hf-visually-hidden">{lowerFirst(row.header)}</span>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
    <Button appearance="soft" icon="plus" name={add.name} type="submit" value={add.value}>
      {add.label}
    </Button>
  </div>
)
