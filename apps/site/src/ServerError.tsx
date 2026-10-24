import { Heading, Link, List, Page, Text } from '@fansite/design-system'

/** The title of the page, and its h1. */
export const serverErrorTitle = 'Er ging iets mis'

/**
 * What a visitor sees when a page fails because of an error on our side. The text says that it's our fault and what to
 * do, and not what went wrong: in production Next.js keeps the details of an error from the page, so it doesn't know
 * whether it was the database. It is the main of the page; the layout puts the header and the footer around it.
 */
export function ServerError({ retryHref }: { retryHref: string }) {
  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>{serverErrorTitle}</Heading>
        <Text appearance="intro">Deze pagina lukt nu even niet. Dat ligt aan ons, niet aan jou.</Text>
        <Text>
          Probeer het over een paar minuten opnieuw. Lukt het dan nog niet, meld het dan op{' '}
          <Link href="https://forum.heerenveen.org">het forum</Link>.
        </Text>
        <List>
          <List.Item>
            <Link href={retryHref}>Probeer het opnieuw</Link>
          </List.Item>
          <List.Item>
            <Link href="/">Naar de homepage</Link>
          </List.Item>
        </List>
      </Page.Cell>
    </Page.Main>
  )
}
