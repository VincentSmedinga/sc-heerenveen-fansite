/*
 * The components of the design system, as TypeScript source: the site compiles them along. The styles are in
 * index.css, which the site imports as well.
 */

export { Body } from './components/body/Body'
export type { BodyProps } from './components/body/Body'
export { Card, cardElements, cardSurfaces } from './components/card/Card'
export type { CardElement, CardProps, CardSurface } from './components/card/Card'
export { Heading, headingLevels } from './components/heading/Heading'
export type { HeadingLevel, HeadingProps } from './components/heading/Heading'
export { Link } from './components/link/Link'
export type { LinkProps } from './components/link/Link'
export { List, listElements } from './components/list/List'
export type { ListElement, ListItemProps, ListProps } from './components/list/List'
export { Logo } from './components/logo/Logo'
export type { LogoProps } from './components/logo/Logo'
export { Navigation } from './components/navigation/Navigation'
export type { NavigationItem, NavigationProps } from './components/navigation/Navigation'
export { NewsItem } from './components/news-item/NewsItem'
export type { NewsItemProps } from './components/news-item/NewsItem'
export { Page } from './components/page/Page'
export type {
  PageBodyProps,
  PageCellProps,
  PageFooterProps,
  PageHeaderProps,
  PageMainProps,
  PageProps,
  PageSidebarProps,
} from './components/page/Page'
export { Root } from './components/root/Root'
export type { RootProps } from './components/root/Root'
export { Text, textAppearances, textElements } from './components/text/Text'
export type { TextAppearance, TextElement, TextProps } from './components/text/Text'
