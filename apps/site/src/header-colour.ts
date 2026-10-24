/**
 * The colour of the header of the site, read from the CSS of the colour tokens in the design system, so the icons and
 * the manifest never hold a second copy of it. The role `--hf-colour-background-header` is a `light-dark()` of two
 * scale colours, and each scale colour is a hex value in the same file. This module imports nothing, so the script
 * that makes the icons can use it too.
 */
export function headerColourOf(css: string) {
  const role = css.match(
    /--hf-colour-background-header:\s*light-dark\(\s*var\((--[\w-]+)\)\s*,\s*var\((--[\w-]+)\)\s*\)/,
  )

  if (role === null) {
    throw new Error('The CSS has no --hf-colour-background-header made of light-dark() and two scale colours.')
  }

  const hexOf = (name: string) => {
    const value = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})\\s*;`, 'i'))?.[1]

    if (value === undefined) {
      throw new Error(`The CSS has no hex colour for ${name}.`)
    }

    return value.toLowerCase()
  }

  return { dark: hexOf(role[2]!), light: hexOf(role[1]!) }
}
