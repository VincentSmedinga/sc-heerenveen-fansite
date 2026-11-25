import type { ComponentPropsWithoutRef } from 'react'

export type RuleProps = Omit<ComponentPropsWithoutRef<'hr'>, 'children'>

/**
 * A thin line between two subjects: an `hr`, in the colour of the borders, or of the lines of
 * the card it stands in. elements.css gives it its look, and the flow the space around it.
 */
export const Rule = (props: RuleProps) => <hr {...props} />
