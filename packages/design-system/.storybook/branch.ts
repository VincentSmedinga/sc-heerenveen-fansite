/*
 * The branch that `pnpm review` shows in the sidebar of Storybook (see scripts/review.js). main.ts reads REVIEW_BRANCH when
 * the dev server starts and puts it in the head of the manager as a meta tag, because the manager runs in the browser and
 * can't read the environment. manager.ts reads the tag back.
 */

// What a branch name may hold. The name ends up in HTML, so nothing else gets in.
const branchName = /^[\w./-]+$/

export const branchMetaName = 'review-branch'

/**
 * Adds the branch to the head of the manager. Only `storybook dev` shows it: a build, such as the one on
 * ds.heerenveen.org, never does.
 */
export const addBranchTo = (head: string, branch: string | undefined, configType: string) =>
  configType === 'DEVELOPMENT' && branch !== undefined && branchName.test(branch)
    ? `${head}<meta name="${branchMetaName}" content="${branch}">`
    : head

/** The line with the branch for under the title in the sidebar, or nothing without a branch. */
export const branchLine = (branch: string | undefined) =>
  branch !== undefined && branchName.test(branch)
    ? `<span style="display: block; font-size: 0.8125rem; font-weight: normal; overflow-wrap: anywhere">${branch}</span>`
    : ''
