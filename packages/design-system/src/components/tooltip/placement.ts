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
  /** How far the tooltip may go above the top of the parent, in pixels. Default 0. */
  overhang?: number
  parent: TooltipSize
  tooltip: TooltipSize
}

/** A width and a height, in pixels. */
export type TooltipSize = { height: number; width: number }

/** `value` kept between `least` and `most`, to a hundredth of a pixel. No room is `least`. */
const keep = (value: number, least: number, most: number) =>
  Math.round(Math.max(least, Math.min(value, most)) * 100) / 100 + 0

/**
 * Where a tooltip goes in its parent: centred on the place, above it, or below it when there
 * is no room above. It never goes past an edge of the parent, so a place at the edge gets a
 * tooltip that is shifted along, not one that is cut off. The top is the one exception: the
 * parent can say it has room above it (`overhang`), such as the padding of a chart.
 */
export function placeTooltip({ anchor, gap, overhang = 0, parent, tooltip }: TooltipPlacementInput): TooltipPlacement {
  const above = anchor.y - gap - tooltip.height
  const side = above >= -overhang ? 'above' : 'below'

  return {
    side,
    x: keep(anchor.x - tooltip.width / 2, 0, parent.width - tooltip.width),
    y: keep(side === 'above' ? above : anchor.y + gap, -overhang, parent.height - tooltip.height),
  }
}
