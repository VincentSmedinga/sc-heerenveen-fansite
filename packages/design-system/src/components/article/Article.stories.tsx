import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Emphasis } from '../emphasis/Emphasis'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { Page } from '../page/Page'
import { Strong } from '../strong/Strong'
import { Text } from '../text/Text'
import { Article, type ArticleProps } from './Article'

const meta = preview.meta({
  argTypes: {
    author: { description: 'De naam bij het artikel, zoals "de redactie". Het component schrijft er "Door" voor.' },
    date: { description: 'De datum zoals een lezer hem leest.' },
    dateTime: { description: 'Dezelfde dag voor het `time`-element, zoals `2026-10-25`.' },
    intro: { description: 'De inleiding in een of twee zinnen.' },
    title: { description: 'De titel van het artikel. Hij is de `h1` van de pagina.' },
  },
  component: Article,
  parameters: {
    docs: {
      description: {
        component: [
          'Een artikel van onze eigen redactie, op een pagina van zichzelf: de titel, de auteur en de datum, de inleiding en de tekst.',
          "De tekst geef je als kinderen: alinea's met `Text`, koppen van niveau 2 met `Heading`, lijsten met `List`, vet met `Strong`, cursief met `Emphasis` en links met `Link`.",
          'Het is gebouwd uit `Heading`, `Text`, `Time` en de onderdelen voor de tekst, en staat in een `Page.Main`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/Article',
})

// The text is made up, and so are the names.
const render = (args: ArticleProps) => (
  <Page.Body>
    <Page.Main>
      <Article {...args}>
        <Text>
          We zijn supporters, geen journalisten. We schrijven <Strong>niet</Strong> over wat anderen al schreven, maar
          we <Emphasis>wijzen</Emphasis> je de weg naar hun verhaal.
        </Text>
        <Heading level={2}>Wat we doen</Heading>
        <Text>
          Als we iets van een ander noemen, staat de naam van de bron erbij, met een link naar het verhaal, zoals{' '}
          <Link href="#testkrant" icon="external-link">
            de Testkrant
          </Link>
          . Ons eigen werk vind je op <Link href="#bronnen">Onze bronnen</Link>.
        </Text>
        <List>
          <List.Item>Een artikel met een kop en een intro</List.Item>
          <List.Item>Altijd de bron erbij</List.Item>
        </List>
        <Heading level={2}>Een lange regel zonder spaties</Heading>
        <Text>
          Heelerglangewoordenzonderspatieswaarnaareenlinkstaat:
          https://www.voorbeeldkrant.test/een/heel/lang/adres/zonder/spaties/naar/het/verhaal
        </Text>
      </Article>
    </Page.Main>
  </Page.Body>
)

export const Default = meta.story({
  args: {
    author: 'de redactie',
    date: '25 oktober 2026',
    dateTime: '2026-10-25',
    intro: 'Wij zijn de redactie van de Fansite. Hier lees je wie we zijn en wat je van ons mag verwachten.',
    title: 'Dit zijn wij',
  },
  name: 'Artikel',
  render,
})
