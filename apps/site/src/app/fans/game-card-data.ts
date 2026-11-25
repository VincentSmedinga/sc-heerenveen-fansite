import type { GameStatusAction, KeyFigure } from '@fansite/design-system'
import type { DataTableRow, MatchProps, TagProps } from '@fansite/design-system'

import { deadlineText } from '#src/fans/prediction'
import { mayTakePart } from '#src/fans/take-part'

// What a card of a game on the page Fans says (issue 1646). A reader per game works it out,
// and GameCard.tsx draws it.

/** The supporter of the session, as far as the cards need one. */
export type CardSupporter = { createdAt: Date; disabledAt: Date | null; id: number }

export type GameCardData = {
  action: GameStatusAction
  game: 'fantest' | 'fjouwer' | 'prognose' | 'uitblinker'
  heading: string
  /** The lines for everybody, such as how many fans took part. */
  lines: string[]
  /** The match the game is about. */
  match?: MatchProps
  /** What is of the supporter: lines of text, and for Fjouwer the points of the last match. */
  mine?: { figures?: KeyFigure[]; lines: string[] }
  /** The top three of the ranking, with its caption. */
  ranking?: { caption: string; rows: DataTableRow[] }
  tag: { text: string; tone: NonNullable<TagProps['tone']> }
  /** The Uitblinker of the last match with a result, and how many fans gave grades. */
  winner?: { count: string; star?: { average: string; line: string; name: string } }
}

/** The tag of a game that is open, with the moment it closes: "Open tot za 16.45". */
export const openTag = (closesAt: Date, now: Date) => ({ text: deadlineText(closesAt, now), tone: 'open' }) as const

export const todoTag = { text: 'Nog te doen', tone: 'todo' } as const

export const closedTag = { text: 'Gesloten', tone: 'closed' } as const

/** The supporter who may take part, or nobody: a blocked account gets nothing of its own. */
export const playerOf = (supporter: CardSupporter | undefined) =>
  supporter !== undefined && mayTakePart(supporter) ? supporter : undefined

/** "1 fan voorspelde al.", "48 fans voorspelden al.", or nothing for nobody. */
export const countLines = (count: number, one: string, many: string) =>
  count === 0 ? [] : [count === 1 ? `1 fan ${one}.` : `${count} fans ${many}.`]

/** How many rows a short ranking shows. */
export const shortRows = 3
