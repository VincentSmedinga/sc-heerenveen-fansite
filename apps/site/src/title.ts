import { reviewBranch } from './env'

/** A title with the branch in front of it, when `pnpm review` shows one in the dev server, so the tab says what runs. */
export function withBranch(title: string, branch = reviewBranch()) {
  return branch === undefined ? title : `${branch} · ${title}`
}
