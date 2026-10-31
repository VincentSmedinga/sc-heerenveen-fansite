/**
 * The sizes a button or a field can have: the standard size, and the small one for a control
 * next to the content, such as a picker or a switch in a side column or a toolbar.
 */
export const sizes = ['default', 'small'] as const

export type Size = (typeof sizes)[number]

/**
 * The class for a size, shared by every component that has one. The standard size has no class,
 * so nothing changes for a component without a `size`.
 */
export const sizeClassName = (size: Size): string | undefined => (size === 'small' ? 'hf-size-small' : undefined)
