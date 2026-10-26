import preview from '#.storybook/preview'

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
