/**
 * A title with the branch in front of it, when `pnpm review` shows one in the dev server, so the tab says what runs. The
 * branch comes from reviewBranch() in env.ts on the server, and from a meta tag in the browser (see app/error.tsx).
 */
export function withBranch(title: string, branch: string | undefined) {
  return branch === undefined || branch === '' ? title : `${branch} · ${title}`
}
