import preview from '#.storybook/preview'

import { List } from '../list/List'
import { NewsItem } from './NewsItem'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een regel nieuws van een andere bron: de kop als link naar het bericht bij de bron, en daaronder de naam van de bron, de tijd en, als het bericht achter een betaalmuur staat, "voor abonnees".',
          '',
          '- `headline` is de kop, zoals de bron hem publiceerde.',
          '  Het component past hem niet aan.',
          '- `href` is het adres van het bericht bij de bron.',
          '  De link opent in hetzelfde tabblad.',
          '- `source` is de naam van de bron, zoals de bron vermeld wil worden.',
          '- `time` is de tijd zoals een bezoeker hem leest, zoals "14:05".',
          '  `dateTime` is de volledige tijd voor het `time`-element, zoals `2026-10-21T12:05:00Z`.',
          '  Het component kent geen tijdzone: de pagina zegt welke tijd de bezoeker ziet.',
          '- `paywalled` zet "voor abonnees" achter de tijd.',
          '  Dat staat in tekst, zodat het ook werkt voor een schermlezer en zonder kleur.',
          '',
          'Het component heeft geen props voor een intro of een foto.',
          'Die tonen we alleen met toestemming van de bron (principe 1 en 2 van de Redactie).',
          'Er staat ook geen logo of pictogram van de bron bij (principe 3).',
          '',
          'Het component is een `div`.',
          'Zet hem in een `List.Item` voor een lijst met nieuws.',
          'De kop is minstens 24 pixels hoog, en een lange kop loopt door op de volgende regel.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/NewsItem',
})

const render = () => (
  <List loose>
    <List.Item>
      <NewsItem
        dateTime="2026-10-21T12:05:00Z"
        headline="Heerenveen wint in blessuretijd van Testclub"
        href="#heerenveen-wint"
        source="Testkrant"
        time="14:05"
      />
    </List.Item>
    <List.Item>
      <NewsItem
        dateTime="2026-10-21T08:30:00Z"
        headline="Trainer over de blessures: ‘Er komt niemand terug voor zondag’"
        href="#blessures"
        paywalled
        source="Testkrant"
        time="10:30"
      />
    </List.Item>
  </List>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Zonder en met betaalmuur, licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Zonder en met betaalmuur, donker', render })

const renderLong = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <List loose>
      <List.Item>
        <NewsItem
          dateTime="2026-10-21T12:05:00Z"
          headline="Heerenveen na een wedstrijd vol wendingen, blessures en een doelpunt in de laatste minuut toch nog langs Testclub: ‘Dit is wat we nodig hadden’"
          href="#lang"
          paywalled
          source="Voorbeeldkrant, met dank aan de redactie"
          time="14:05"
        />
      </List.Item>
    </List>
  </div>
)

export const LongHeadlineLight = meta.story({
  globals: { theme: 'light' },
  name: 'Lange kop, licht',
  render: renderLong,
})

export const LongHeadlineDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Lange kop, donker',
  render: renderLong,
})
