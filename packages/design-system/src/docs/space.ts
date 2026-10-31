/** The steps of the space, for the chapter Ruimte: their names, from small to large. */

export type SpaceStep = {
  label: string
  /** A word on the step in the chapter, or empty. */
  name: string
  token: string
}

export const spaceSteps: SpaceStep[] = [
  { label: 'Extra klein', name: '', token: '--hf-space-xs' },
  { label: 'Klein', name: '', token: '--hf-space-s' },
  { label: 'Gemiddeld', name: 'de vaste keuze', token: '--hf-space-m' },
  { label: 'Groot', name: '', token: '--hf-space-l' },
  { label: 'Extra groot', name: 'het raster, en het maximum', token: '--hf-space-xl' },
]
