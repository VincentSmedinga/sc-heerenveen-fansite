import preview from '#.storybook/preview'

import { Pompebled } from '../docs/Pompebled'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: 'Een afbeelding met een bijschrift in de stijl van meta, in secundaire tekstkleur.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Figuur',
})

export const Figure = meta.story({
  name: 'Figuur met bijschrift',
  render: () => (
    <figure style={{ maxInlineSize: '32rem' }}>
      <svg
        aria-label="Drie rode pompeblêden op een blauw vlak"
        role="img"
        style={{ backgroundColor: 'var(--hf-colour-blue-800)', borderRadius: '0.5rem' }}
        viewBox="-20 -23 115 42"
      >
        {[0, 36, 72].map((x) => (
          <Pompebled fill="var(--hf-colour-red-600)" key={x} x={x} />
        ))}
      </svg>
      <figcaption>De pompeblêden uit de Friese vlag, het motief op de wedstrijdband.</figcaption>
    </figure>
  ),
})
