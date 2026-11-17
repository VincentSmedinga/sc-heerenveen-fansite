import { TableColumnIcon, type TableColumnIconName } from './TableColumnIcon'

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * The content of a column header that has an icon: the icon for the eye, and the whole word
 * for a screen reader, hidden from the eye. The `title` is the word with a capital. In a
 * button the word is its name, so speech control can say "click gespeeld" (WCAG 2.5.3).
 */
export const TableColumnHead = ({ icon, name }: { icon: TableColumnIconName; name: string }) => (
  <span title={capitalise(name)}>
    <TableColumnIcon name={icon} />
    <span className="hf-visually-hidden">{name}</span>
  </span>
)
