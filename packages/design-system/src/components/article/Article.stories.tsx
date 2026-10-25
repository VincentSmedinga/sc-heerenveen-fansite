import preview from '#.storybook/preview'

import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { Page } from '../page/Page'
import { Text } from '../text/Text'
import { Article } from './Article'

const meta = preview.meta({
  component: Article,
  parameters: {
    docs: {
      description: {
        component: [
          'Een artikel van onze eigen redactie, op een pagina van zichzelf.',
          'De titel is de `h1` van de pagina.',
          'Eronder staan de auteur en de datum, dan de inleiding, en daarna de tekst.',
          '',
          '- `title` is de titel van het artikel.',
          '- `author` is de naam bij het artikel, zoals "de redactie". Het component schrijft er "Door" voor.',
          '- `date` is de datum zoals een lezer hem leest, en `dateTime` dezelfde dag voor het `time`-element, zoals `2026-10-25`.',
          '- `intro` is de inleiding in een of twee zinnen.',
          "- De tekst geef je als kinderen: alinea's met `Text`, koppen van niveau 2 met `Heading`, lijsten met `List` en links met `Link`. Een link naar een andere site krijgt het pictogram voor een externe link.",
          '',
          'Zet het artikel in een `Page.Main`, zodat de `article` in de `main` staat.',
          'De tekst van een artikel komt uit de database en wordt op de site omgezet naar deze onderdelen; er is geen HTML bij.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Article',
})

// The text is made up, and so are the names.
const render = () => (
  <Page.Body>
    <Page.Main>
      <Article
        author="de redactie"
        date="25 oktober 2026"
        dateTime="2026-10-25"
        intro="Wij zijn de redactie van de Fansite. Hier lees je wie we zijn en wat je van ons mag verwachten."
        title="Dit zijn wij"
      >
        <Text>
          We zijn supporters, geen journalisten. We schrijven <strong>niet</strong> over wat anderen al schreven, maar
          we <em>wijzen</em> je de weg naar hun verhaal.
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

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
