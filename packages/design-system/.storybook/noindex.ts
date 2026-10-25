/*
 * Keeps the published Storybook (ds.heerenveen.org) out of search results. The pages are for contributors and agents, not
 * for visitors of the site. main.ts adds this tag to the head of the manager (index.html) and of the preview (iframe.html).
 */

export const noindexTag = '<meta name="robots" content="noindex">'

/** Adds the tag to a head. In every build and in the dev server, so the build that goes live can't miss it. */
export const addNoindexTo = (head: string) => `${head}${noindexTag}`
