import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { NewsItem } from './NewsItem'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een regel nieuws van een andere bron. Links staan de korte dag en de tijd in rood, zoals "wo 14:05".',
          'Daarnaast staat de kop als link naar het bericht bij de bron, en daaronder de naam van de bron met een klein pictogram voor een link naar buiten en, als het bericht achter een betaalmuur staat, "voor abonnees".',
          '',
          '- `headline` is de kop, zoals de bron hem publiceerde.',
          '  Het component past hem niet aan.',
          '- `href` is het adres van het bericht bij de bron.',
          '  De link opent in hetzelfde tabblad.',
          '- `source` is de naam van de bron, zoals de bron vermeld wil worden.',
          '- `time` is de korte dag en de tijd zoals een bezoeker ze leest, zoals "wo 14:05".',
          '  `dateTime` is de volledige tijd voor het `time`-element, zoals `2026-10-21T12:05:00Z`.',
          '  Het component kent geen tijdzone en rekent niet: de pagina zegt welke dag en tijd de bezoeker ziet.',
          '- `paywalled` zet "voor abonnees" onder de kop, achter de naam van de bron.',
          '  Dat staat in tekst, zodat het ook werkt voor een schermlezer en zonder kleur.',
          '',
          'Het component heeft geen props voor een intro of een foto.',
          'Die tonen we alleen met toestemming van de bron (principe 1 en 2 van de Redactie).',
          'Er staat ook geen logo of pictogram van de bron bij (principe 3).',
          'Het pictogram bij de naam is geen pictogram van de bron: het zegt dat de kop naar een andere site gaat.',
          'Het is onze eigen SVG, in de kleur van de tekst, en voor een schermlezer verborgen.',
          'De naam van de link is de kop alleen.',
          '',
          'Het component is een `div`.',
          'Zet hem in een `List.Item` voor een lijst met nieuws, en geef de `List` `role="list"`: Safari noemt een lijst zonder opsommingstekens anders geen lijst meer.',
          'De lijst krijgt dan geen opsommingstekens en geen inspringing, en tussen de regels staat een dunne lijn.',
          'Zet de lijst in een `Card` met het witte vlak: daarop haalt het rood 4,5:1, in licht en donker.',
          'De kop is minstens 24 pixels hoog, en een lange kop loopt door op de volgende regel.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/NewsItem',
})

const render = () => (
  <Card aria-labelledby="nieuws-kop">
    <Heading id="nieuws-kop" level={2}>
      sc Heerenveen in de media
    </Heading>
    <List role="list">
      <List.Item>
        <NewsItem
          dateTime="2026-10-21T12:05:00Z"
          headline="Heerenveen wint in blessuretijd van Testclub"
          href="#heerenveen-wint"
          source="Testkrant"
          time="wo 14:05"
        />
      </List.Item>
      <List.Item>
        <NewsItem
          dateTime="2026-10-21T08:30:00Z"
          headline="Trainer over de blessures: ‘Er komt niemand terug voor zondag’"
          href="#blessures"
          paywalled
          source="Testkrant"
          time="wo 10:30"
        />
      </List.Item>
      <List.Item>
        <NewsItem
          dateTime="2026-10-20T17:45:00Z"
          headline="Jeugdspeler tekent zijn eerste contract"
          href="#contract"
          source="Voorbeeldkrant"
          time="di 19:45"
        />
      </List.Item>
    </List>
  </Card>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Zonder en met betaalmuur, licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Zonder en met betaalmuur, donker', render })

const renderLong = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-label="Een lange kop">
      <List role="list">
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T12:05:00Z"
            headline="Heerenveen na een wedstrijd vol wendingen, blessures en een doelpunt in de laatste minuut toch nog langs Testclub: ‘Dit is wat we nodig hadden’"
            href="#lang"
            paywalled
            source="Voorbeeldkrant, met dank aan de redactie"
            time="wo 14:05"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T08:30:00Z"
            headline="Trainer"
            href="#kort"
            source="Testkrant"
            time="wo 10:30"
          />
        </List.Item>
      </List>
    </Card>
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
