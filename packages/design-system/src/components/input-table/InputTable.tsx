import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react'

import { Button } from '../button/Button'
import { classNames } from '../classNames'
import { Field, type FieldProps } from '../field/Field'
import { IconButton } from '../icon-button/IconButton'

/** A button that sends the form: its `name` and `value` tell the server which was pressed. */
export type InputTableButton = {
  name: string
  value?: string
}

export type InputTableColumn = {
  /**
   * Leaves "niet verplicht" out of the labels of a column that is not required, as
   * `hideOptional` does in a Field. The fields keep their `required`.
   */
  hideOptional?: boolean
  /**
   * The line of the row the fields of the column are on, `1` or `2`. Without it, they are on
   * the first line. A row with a second line is two lines of fields under each other.
   */
  line?: 1 | 2
  /** The visible label of each field of the column, such as `Minuut`. */
  name: string
  /**
   * Whether the fields of the column have to be filled in, as in a Field. Without it, they do.
   * A column that is not required says so in its labels, in words: "niet verplicht".
   */
  required?: boolean
  /**
   * How much room the fields of the column take on their line. `default` shares what is left,
   * `narrow` is for a short answer, such as a minute, and `natural` is as wide as the answer,
   * such as a choice of a few words. Give a `natural` Select the same `width`.
   */
  width?: 'default' | 'narrow' | 'natural'
}

/**
 * A field of a row: a field in a Field (`control`), or a group that is its own field, such as a
 * RadioGroup (`group`). Both have the `id` an ErrorSummary links to, an `error`, and can be
 * hidden.
 */
export type InputTableField = (
  | {
      /** The field: an Input, a Textarea or a Select. */
      control: FieldProps['children']
      group?: never
    }
  | {
      control?: never
      /**
       * A field that is a group, such as a RadioGroup. The table gives the label, which has the
       * name of the row in it for a screen reader, and the group puts it in its legend.
       */
      group: (legend: ReactNode) => ReactElement
    }
) & {
  /** What is wrong with the answer. Without it, the field has no error. */
  error?: string | undefined
  /**
   * Hides a field that does not apply to the row, such as the name of a player when the player
   * is chosen from a list. It is not shown, it is not sent with the form, and it keeps what was
   * entered, so a mistake does not wipe it.
   */
  hidden?: boolean
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
  /** The columns, from the left, on one or two lines. A column is a field in every row. */
  columns: readonly InputTableColumn[]
  /**
   * What is shown instead of the table when it has no rows yet, such as a line of text. The
   * button to add a row stays.
   */
  empty?: ReactNode
  /**
   * What the buttons that move a row say, which a screen reader hears after the name of the
   * row: `Speler 2 omhoog`. Without them, they are `Omhoog` and `Omlaag`.
   */
  moveLabels?: { down: string; up: string }
  /**
   * What the button that removes a row says, which a screen reader hears after the name of the
   * row: `Doelpunt 2 weghalen`. Without it, it is `Weghalen`. The button shows a bin, and the
   * words show when the pointer rests on it.
   */
  removeLabel?: string
  /** The rows, from the top. */
  rows: readonly InputTableRow[]
}

export type InputTableRow = {
  /** The fields of the row, one for each column, in the order of the columns. */
  fields: readonly InputTableField[]
  /**
   * What the row is called, such as `Doelpunt 2`. A screen reader hears it with each field and
   * the button, and it must be unique.
   */
  header: string
  /** What the eye sees as the row header, such as `2`. Without it, it is the `header`. */
  mark?: string
  /**
   * The buttons that move the row up or down, for a list whose order matters. Leave one out
   * where the row can't go that way, such as `up` for the first row: the button is then not
   * there, so the keyboard doesn't stop on a button that does nothing. They are submit buttons
   * too. Each has an `id`, so the server can say which one gets the focus after the move.
   */
  move?: { down?: InputTableButton & { id: string }; up?: InputTableButton & { id: string } }
  /** The button that removes the row: a submit button. */
  remove: InputTableButton
}

// The name of a row in the middle of a sentence: "Doelpunt 2" becomes "doelpunt 2".
const lowerFirst = (name: string) => name.charAt(0).toLowerCase() + name.slice(1)

/**
 * A table of rows of fields, for a list in which the editor fills in the same things again and
 * again, such as the goals of a match. Every field has its own visible label, with the name of
 * the row in it for a screen reader: `Minuut, doelpunt 2`. A row can have two lines of fields,
 * and a field that does not apply to a row can be hidden. The header of a row is its number,
 * and every row has a button to remove it, a bin with a name. A row can also have buttons to
 * move it up or down, with arrows. Under the table a button adds a row.
 * Both are submit buttons, so the table works without JavaScript: the server answers with the
 * form again, with the row added or removed. Put it in a Form.
 *
 * Where the table is wide, a row is its lines next to the header and the button. Where it is
 * not, which is on a phone, a row is a block (input-table.css), so nothing scrolls sideways. A
 * page that wants the room gives it with a wide Page.Main.
 */
export const InputTable = ({
  add,
  caption,
  className,
  columns,
  empty,
  moveLabels = { down: 'Omlaag', up: 'Omhoog' },
  removeLabel = 'Weghalen',
  rows,
  ...props
}: InputTableProps) => {
  const lines = [...new Set(columns.map((column) => column.line ?? 1))].toSorted((a, b) => a - b)

  return (
    <div {...props} className={classNames('hf-input-table', className)}>
      {rows.length === 0 ? (
        empty
      ) : (
        <table>
          <caption className="hf-visually-hidden">{caption}</caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.header}>
                <th scope="row">
                  <span aria-hidden="true">{row.mark ?? row.header}</span>
                  <span className="hf-visually-hidden">{row.header}</span>
                </th>
                {lines.map((line) => (
                  <td className={`hf-input-table-line-${line}`} key={line}>
                    {row.fields.map((field, index) => {
                      const column = columns[index]

                      return column === undefined || (column.line ?? 1) !== line ? null : (
                        <Item column={column} field={field} key={field.id} row={row} />
                      )
                    })}
                  </td>
                ))}
                <td className="hf-input-table-action">
                  {row.move?.up === undefined ? null : (
                    <IconButton
                      icon="arrow-up"
                      id={row.move.up.id}
                      label={`${row.header} ${lowerFirst(moveLabels.up)}`}
                      name={row.move.up.name}
                      type="submit"
                      value={row.move.up.value}
                    />
                  )}
                  {row.move?.down === undefined ? null : (
                    <IconButton
                      icon="arrow-down"
                      id={row.move.down.id}
                      label={`${row.header} ${lowerFirst(moveLabels.down)}`}
                      name={row.move.down.name}
                      type="submit"
                      value={row.move.down.value}
                    />
                  )}
                  <IconButton
                    icon="trash"
                    label={`${row.header} ${lowerFirst(removeLabel)}`}
                    name={row.remove.name}
                    type="submit"
                    value={row.remove.value}
                  />
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
}

/** One field of a row, with its label, or the group that is the field. */
const Item = ({ column, field, row }: { column: InputTableColumn; field: InputTableField; row: InputTableRow }) => {
  const label = (
    <>
      {column.name}
      <span className="hf-visually-hidden">, {lowerFirst(row.header)}</span>
    </>
  )
  const hidden = field.hidden === true
  const className = classNames('hf-input-table-item', column.width !== undefined && `hf-input-table-${column.width}`)
  const content =
    field.group === undefined ? (
      <Field
        className="hf-input-table-field"
        error={field.error}
        hideOptional={column.hideOptional === true}
        id={field.id}
        label={label}
        required={column.required ?? true}
      >
        {field.control}
      </Field>
    ) : (
      field.group(label)
    )

  // A disabled fieldset disables every field inside it, so a hidden field is not sent. Every
  // item is the same element, so a field that is hidden and shown again is not made anew, and
  // keeps what was typed in it. The role takes the group away that a screen reader would hear.
  return (
    <fieldset className={className} disabled={hidden} hidden={hidden} role="none">
      {content}
    </fieldset>
  )
}
