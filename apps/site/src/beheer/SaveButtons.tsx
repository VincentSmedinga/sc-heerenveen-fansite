import { Button, Link } from '@fansite/design-system'

type SaveButton = {
  appearance?: 'default' | 'soft'
  /** The text of the button, the same as the button at the end of the form. */
  label: string
  /** Leaves the icon of a disk out, for a button that doesn't save, such as "Tekst lezen". */
  noIcon?: boolean
  /** The value of the button, for a form whose action reads `knop`. */
  value?: string
}

/**
 * The buttons to save a form, and the link to cancel, for the Page.Toolbar of a page of the
 * admin. They are the second copy: the form has the same buttons at its end, and each one sends
 * the same form through the attribute `form`, so it works without JavaScript. Two buttons with
 * one name on a page do the same thing, so that is no problem for a screen reader. Use it for
 * the buttons that save, never for one that deletes.
 */
export function SaveButtons({
  buttons,
  cancelHref,
  formId,
}: {
  buttons: readonly SaveButton[]
  cancelHref?: string
  formId: string
}) {
  return (
    <>
      {buttons.map(({ appearance = 'default', label, noIcon = false, value }) => (
        <Button
          appearance={appearance}
          form={formId}
          {...(noIcon ? {} : { icon: 'save' as const })}
          key={label}
          name={value === undefined ? undefined : 'knop'}
          type="submit"
          value={value}
        >
          {label}
        </Button>
      ))}
      {cancelHref === undefined ? null : <Link href={cancelHref}>Annuleren</Link>}
    </>
  )
}
