import preview from '#.storybook/preview'

import { Text } from './Text'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Lopende tekst.',
          '',
          'Met `as` kies je het element uit een vaste lijst:',
          '',
          '- `p` (standaard): een alinea.',
          '- `span`: tekst binnen een regel, zoals een bronnaam naast een tijd.',
          '',
          'Met `appearance` kies je de typestijl: `body` (Tekst) of `meta` (Meta).',
          'Zonder `appearance` neemt de tekst de stijl van zijn omgeving.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Text',
})

const render = () => (
  <div style={{ maxInlineSize: '40rem' }}>
    <Text appearance="body">
      Hier komen de koppen van de media die over de club schrijven. Elke kop is een link naar de journalist zelf.
    </Text>
    <Text appearance="meta">
      <Text appearance="meta" as="span">
        vr 16/10
      </Text>{' '}
      · Omrop Fryslân
    </Text>
  </div>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
