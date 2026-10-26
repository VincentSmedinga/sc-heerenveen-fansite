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
          'Een inleiding breekt in balans: de woorden zijn over de regels verdeeld, zodat de regels ongeveer even lang zijn.',
          '',
          'Met `appearance` kies je de typestijl: `body` (Tekst), `intro` (Inleiding) of `meta` (Meta).',
          '',
          'Een inleiding is de eerste alinea onder de paginatitel en alleen voor een `p`.',
          'De inhoud staat in een `b`: `<p><b>…</b></p>`.',
          'Met de opmaak heeft de `b` het gewicht van gewone tekst, en valt de inleiding op door de grotere letters.',
          'Laadt de opmaak niet, dan toont de browser de `b` vet, en valt de inleiding ook dan op.',
          'Een `b` zegt niets over betekenis, dus een schermlezer leest hem niet met nadruk.',
          '',
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
    <Text appearance="intro">
      We zetten de koppen van de media over sc Heerenveen op één plek, met een link naar het hele verhaal. Een tweede
      zin laat zien hoe de inleiding doorloopt op een volgende regel, met een <a href="/bronnen">link</a> erin.
    </Text>
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
