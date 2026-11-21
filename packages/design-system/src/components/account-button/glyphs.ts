/**
 * The capitals A to Z as lines, for the initials on the chest of the AccountButton. Each letter
 * is drawn in a box 4 wide and 5 high, as a path for a stroke with round ends, like the rest of
 * the supporter. The initials are part of the drawing, not text: the drawing is hidden from
 * assistive technology, and the name of the button says where it goes.
 */
export const glyphs: Readonly<Record<string, string>> = {
  A: 'M0 5L2 0L4 5M0.8 3.2H3.2',
  B: 'M0 5V0H2.2A1.2 1.2 0 0 1 2.2 2.4H0M2.2 2.4H2.4A1.3 1.3 0 0 1 2.4 5H0',
  C: 'M4 0.9A2 2.5 0 1 0 4 4.1',
  D: 'M0 0V5H1.5A2.5 2.5 0 0 0 1.5 0H0',
  E: 'M4 0H0V5H4M0 2.5H3',
  F: 'M4 0H0V5M0 2.5H3',
  G: 'M4 0.9A2 2.5 0 1 0 4 4.1V2.8H2.4',
  H: 'M0 0V5M4 0V5M0 2.5H4',
  I: 'M2 0V5M0.8 0H3.2M0.8 5H3.2',
  J: 'M4 0V3.4A1.6 1.6 0 0 1 0.8 3.4',
  K: 'M0 0V5M4 0L0.4 3M1.6 2L4 5',
  L: 'M0 0V5H4',
  M: 'M0 5V0L2 3L4 0V5',
  N: 'M0 5V0L4 5V0',
  O: 'M2 0A2 2.5 0 1 0 2 5A2 2.5 0 1 0 2 0',
  P: 'M0 5V0H2.5A1.4 1.4 0 0 1 2.5 2.8H0',
  Q: 'M2 0A2 2.5 0 1 0 2 5A2 2.5 0 1 0 2 0M2.6 3.6L4 5',
  R: 'M0 5V0H2.5A1.4 1.4 0 0 1 2.5 2.8H0M2.2 2.8L4 5',
  S: 'M3.8 0.7C3.3 0.2 2.7 0 2 0C1 0 0.2 0.6 0.2 1.3C0.2 3 3.8 2 3.8 3.7C3.8 4.5 3 5 2 5C1.2 5 0.6 4.8 0.2 4.3',
  T: 'M0 0H4M2 0V5',
  U: 'M0 0V3A2 2 0 0 0 4 3V0',
  V: 'M0 0L2 5L4 0',
  W: 'M0 0L1 5L2 1.8L3 5L4 0',
  X: 'M0 0L4 5M4 0L0 5',
  Y: 'M0 0L2 2.5L4 0M2 2.5V5',
  Z: 'M0 0H4L0 5H4',
}

/**
 * The drawing of a letter: an accent is left off (É is drawn as E), and a letter outside A
 * to Z, such as one from another script, has no drawing.
 */
export const glyphOf = (letter: string): string | undefined =>
  glyphs[letter.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()]
