export type TooltipPlacement = {
  /** Whether the tooltip is above the place or, for lack of room, below it. */
  side: 'above' | 'below'
  /** From the left and from the top of the parent, for the corner of the tooltip. */
  x: number
  y: number
}

export type TooltipPlacementInput = {
  /** The place the tooltip is for, in pixels from the left and the top of the parent. */
  anchor: { x: number; y: number }
  /** The room between the place and the tooltip. */
  gap: number
  parent: TooltipSize
  tooltip: TooltipSize
}

/** A width and a height, in pixels. */
export type TooltipSize = { height: number; width: number }

/** `value` kept between 0 and `room`, to a hundredth of a pixel. No room is 0. */
const keep = (value: number, room: number) => Math.round(Math.max(0, Math.min(value, room)) * 100) / 100

/**
 * Where a tooltip goes in its parent: centred on the place, above it, or below it when there
 * is no room above. It never goes past an edge of the parent, so a place at the edge gets a
 * tooltip that is shifted along, not one that is cut off.
 */
export function placeTooltip({ anchor, gap, parent, tooltip }: TooltipPlacementInput): TooltipPlacement {
  const above = anchor.y - gap - tooltip.height
  const side = above >= 0 ? 'above' : 'below'

  return {
    side,
    x: keep(anchor.x - tooltip.width / 2, parent.width - tooltip.width),
    y: keep(side === 'above' ? above : anchor.y + gap, parent.height - tooltip.height),
  }
}
