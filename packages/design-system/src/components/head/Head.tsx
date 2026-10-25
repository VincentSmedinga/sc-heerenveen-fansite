export type HeadProps = {
  /**
   * The address of a script of the site that runs before the first paint, such as `/theme.js`.
   * It is a classic script that blocks, on purpose, and it is on the same origin as the page.
   * Next.js adds everything else, from its Metadata API.
   */
  script?: string
}

/**
 * The `head` element of a page, for the one thing Next.js can't do: a script that runs before
 * the first paint. The script that puts a visitor's choice of theme on the page is the example,
 * because a script that waits for the app to start comes too late and the page flashes. Next.js
 * fills the rest of the `head` from its Metadata API. Put it in `Root`, before `Body`.
 */
export const Head = ({ script }: HeadProps) => <head>{script === undefined ? null : <script src={script} />}</head>
