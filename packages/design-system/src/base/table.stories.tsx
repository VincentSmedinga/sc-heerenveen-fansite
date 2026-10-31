import preview from '#.storybook/preview'

import { Card } from '../components/card/Card'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component:
          'Tabellen gebruiken tabelcijfers, zodat getallen recht onder elkaar staan. De klasse `hf-numeric` lijnt een cel uit aan het eind, `hf-highlight` markeert een rij en `hf-rank` geeft een positie de kleur van markeringen. De stand van de competitie heeft een eigen component, `StandingsTable`, dat deze klassen gebruikt; de klassen blijven voor andere tabellen.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Tabel',
})

const standings = [
  { goalDifference: '+21', played: 9, points: 23, position: 1, team: 'Feyenoord' },
  { goalDifference: '+10', played: 9, points: 20, position: 2, team: 'AZ' },
  { goalDifference: '+15', played: 9, points: 19, position: 3, team: 'PSV' },
  { goalDifference: '+3', played: 9, points: 14, position: 7, team: 'FC Groningen' },
  { goalDifference: '+4', played: 9, points: 12, position: 8, team: 'sc Heerenveen' },
  { goalDifference: '−1', played: 9, points: 11, position: 9, team: 'Go Ahead Eagles' },
  { goalDifference: '−9', played: 9, points: 6, position: 17, team: 'ADO Den Haag' },
]

export const Standings = meta.story({
  name: 'Stand met gemarkeerde rij',
  render: () => (
    <table style={{ maxInlineSize: '32rem' }}>
      <caption>Stand eredivisie na negen speelronden</caption>
      <thead>
        <tr>
          <th className="hf-numeric" scope="col">
            <abbr title="Positie">#</abbr>
          </th>
          <th scope="col">Club</th>
          <th className="hf-numeric" scope="col">
            <abbr title="Gespeeld">G</abbr>
          </th>
          <th className="hf-numeric" scope="col">
            <abbr title="Punten">P</abbr>
          </th>
          <th className="hf-numeric" scope="col">
            <abbr title="Doelsaldo">D</abbr>
          </th>
        </tr>
      </thead>
      <tbody>
        {standings.map(({ goalDifference, played, points, position, team }) => (
          <tr className={team === 'sc Heerenveen' ? 'hf-highlight' : undefined} key={team}>
            <td className="hf-numeric hf-rank">{position}</td>
            <th scope="row">{team}</th>
            <td className="hf-numeric">{played}</td>
            <td className="hf-numeric">{points}</td>
            <td className="hf-numeric">{goalDifference}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
})

// No table or component uses the zebra and hover colours yet, so the story gives the rows those
// colours itself, with the tokens, to show them on a card. The third row shows the colour of a
// row under the mouse.
const zebraParameters = {
  docs: {
    description: {
      story:
        'Zebrarijen en een rij onder de muis op een kaart, met de kleuren die het designsysteem daarvoor vastlegt. Geen tabel gebruikt ze al; het verhaal geeft de rijen zelf die kleuren. De derde rij heeft de kleur van een rij onder de muis.',
    },
  },
}

const renderZebra = () => (
  <>
    <style>{`
      .example-zebra tbody tr:nth-child(even) { background-color: var(--hf-colour-background-zebra); }
      .example-zebra tbody tr:hover, .example-zebra tbody tr[data-example='hover'] {
        background-color: var(--hf-colour-background-hover);
      }
    `}</style>
    <Card aria-label="Stand" style={{ maxInlineSize: '32rem' }}>
      <table className="example-zebra">
        <caption>Stand eredivisie na negen speelronden</caption>
        <thead>
          <tr>
            <th className="hf-numeric" scope="col">
              <abbr title="Positie">#</abbr>
            </th>
            <th scope="col">Club</th>
            <th className="hf-numeric" scope="col">
              <abbr title="Punten">P</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.slice(0, 6).map(({ points, position, team }, index) => (
            <tr data-example={index === 2 ? 'hover' : undefined} key={team}>
              <td className="hf-numeric hf-rank">{position}</td>
              <th scope="row">{team}</th>
              <td className="hf-numeric">{points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </>
)

export const ZebraLight = meta.story({
  globals: { theme: 'light' },
  name: 'Zebrarijen en rij onder de muis, licht',
  parameters: zebraParameters,
  render: renderZebra,
})

export const ZebraDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Zebrarijen en rij onder de muis, donker',
  parameters: zebraParameters,
  render: renderZebra,
})

const scorers = [
  { goals: 12, name: 'Testspeler Een' },
  { goals: 9, name: 'Testspeler Twee' },
  { goals: 4, name: 'Testspeler Drie' },
]

const ScorersTable = () => (
  <table>
    <caption>Doelpunten per speler</caption>
    <thead>
      <tr>
        <th scope="col">Speler</th>
        <th className="hf-numeric" scope="col">
          <abbr title="Doelpunten">D</abbr>
        </th>
      </tr>
    </thead>
    <tbody>
      {scorers.map(({ goals, name }) => (
        <tr key={name}>
          <th scope="row">{name}</th>
          <td className="hf-numeric">{goals}</td>
        </tr>
      ))}
    </tbody>
  </table>
)

export const SpaceBelow = meta.story({
  name: 'Ruimte onder een tabel',
  parameters: {
    docs: {
      description: {
        story:
          'Een tabel met cijfers is een grote bouwsteen: staat er iets onder, zoals een regel met de afkortingen, dan staat daartussen de grote ruimte. Is de tabel het laatste in de kaart, dan komt er geen ruimte onder.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--hf-space-xl)', maxInlineSize: '24rem' }}>
      <Card aria-label="Met iets eronder">
        <ScorersTable />
        <p className="hf-meta">
          <b>D</b> doelpunten
        </p>
      </Card>
      <Card aria-label="Als laatste">
        <ScorersTable />
      </Card>
    </div>
  ),
})
