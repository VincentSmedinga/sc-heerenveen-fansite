import preview from '#.storybook/preview'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: 'Een citaat met een lijn aan het begin van de regel en de bron eronder.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Citaat',
})

export const Blockquote = meta.story({
  name: 'Citaat',
  render: () => (
    <figure style={{ maxInlineSize: '40rem' }}>
      <blockquote>
        <p>
          We tonen de kop, de bron en de tijd, en linken naar het bericht van de journalist. Een intro of foto tonen we
          alleen als de bron daar toestemming voor geeft.
        </p>
      </blockquote>
      <figcaption>Uit het bronnenbeleid van de fansite</figcaption>
    </figure>
  ),
})
