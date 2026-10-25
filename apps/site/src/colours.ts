/**
 * The colour of the header in light and in dark, from the colour tokens of the design system.
 * next.config.ts reads them from the CSS (see header-colour-env.ts) and puts the two values
 * into the code when the site is built, so the server needs no file. These are not variables of
 * the environment: nothing sets them at run time.
 */
const colour = (value: string | undefined) => {
  if (value === undefined) {
    throw new Error('The colour of the header is missing: next.config.ts or vitest.config.ts should have set it.')
  }

  return value
}

export const headerColour = {
  dark: colour(process.env['HEADER_COLOUR_DARK']),
  light: colour(process.env['HEADER_COLOUR_LIGHT']),
}
