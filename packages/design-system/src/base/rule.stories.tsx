import preview from '#.storybook/preview'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: 'Een dunne lijn tussen twee onderwerpen, in de kleur van de randen.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Scheidingslijn',
})

export const Rule = meta.story({
  name: 'Scheidingslijn',
  render: () => (
    <div style={{ maxInlineSize: '40rem' }}>
      <p>Vorige wedstrijd: sc Heerenveen – Excelsior 4-0, eredivisie.</p>
      <hr />
      <p>Volgende wedstrijd: ADO Den Haag – sc Heerenveen, zaterdag 24 oktober, 21:00.</p>
    </div>
  ),
})
