import { create } from 'storybook/theming'

/*
 * Themes for Storybook's own chrome: docs pages in the preview, and the sidebar in the manager.
 * Storybook can't read CSS custom properties here, so the hex values repeat the colour tokens.
 */

const fontBase = "'Atkinson Hyperlegible Next', system-ui, sans-serif"
const fontCode = 'ui-monospace, menlo, consolas, monospace'
export const brandTitle = 'sc Heerenveen Fansite · designsysteem'

export const lightTheme = create({
  appBg: '#f1eee7', // grey-100
  appBorderColor: '#e3dfd7', // grey-200
  appContentBg: '#ffffff', // white
  base: 'light',
  brandTitle,
  colorPrimary: '#a91518', // red-700
  colorSecondary: '#07458e', // blue-700
  fontBase,
  fontCode,
  textColor: '#211e18', // grey-900
  textMutedColor: '#635e54', // grey-600
})

export const darkTheme = create({
  appBg: '#04214e', // blue-900
  appBorderColor: '#07458e', // blue-700
  appContentBg: '#041433', // blue-950
  base: 'dark',
  brandTitle,
  colorPrimary: '#f7a09a', // red-300
  colorSecondary: '#8fbbf0', // blue-300
  fontBase,
  fontCode,
  textColor: '#faf8f4', // grey-50
  textMutedColor: '#bbd7f8', // blue-200
})
