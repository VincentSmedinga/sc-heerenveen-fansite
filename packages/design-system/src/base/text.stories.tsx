import preview from '#.storybook/preview'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: 'Alinea’s en de kleine elementen daarbinnen: `strong`, `em`, `small` en `abbr`.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Tekst',
})

export const Paragraph = meta.story({
  name: 'Alinea',
  render: () => (
    <div style={{ maxInlineSize: '40rem' }}>
      <p>
        De sc Heerenveen Fansite verzamelt sinds 15 maart 1997 het nieuws over de club uit It Hearrenfean. We tonen de
        kop, de bron en de tijd, en linken naar het bericht van de journalist.
      </p>
      <p>
        Supporters maken de site, zonder advertenties en zonder winstoogmerk. We zijn geen officieel onderdeel van sc
        Heerenveen.
      </p>
    </div>
  ),
})

export const InlineElements = meta.story({
  name: 'Nadruk en kleine tekst',
  render: () => (
    <div style={{ maxInlineSize: '40rem' }}>
      <p>
        Het <abbr title="Koninklijke Nederlandse Voetbalbond">KNVB</abbr>-bekerduel tegen Excelsior Maassluis begint om{' '}
        <strong>20:00</strong>. Kaarten zijn <em>alleen</em> te koop via de club.
      </p>
      <p>
        <small>Aanvangstijden kunnen nog veranderen. Kijk op de dag van de wedstrijd op de site van de club.</small>
      </p>
    </div>
  ),
})
