import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Text, textAppearances, textElements } from './Text'

const meta = preview.meta({
  argTypes: {
    appearance: {
      control: 'radio',
      description: 'De typestijl: Tekst, Inleiding of Meta. Zonder stijl neemt de tekst de stijl van zijn omgeving.',
      options: textAppearances,
    },
    as: {
      control: 'radio',
      description: 'Het element: een alinea of tekst binnen een regel. Een inleiding is altijd een alinea.',
      options: textElements,
    },
  },
  component: Text,
  parameters: {
    docs: {
      description: {
        component: [
          'Lopende tekst in de typestijlen van de site: Tekst voor een alinea, Inleiding voor de eerste alinea onder de paginatitel, en Meta voor het kleine werk eromheen, zoals een datum of een bronnaam.',
          'Een inleiding is alleen voor een `p`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/Text',
})

export const Default = meta.story({
  args: { appearance: 'body', as: 'p' },
  name: 'Tekst',
  render: ({ appearance, as, ...args }) =>
    appearance === 'intro' ? (
      <Text {...args} appearance="intro">
        We zetten de koppen van de media over sc Heerenveen op één plek, met een link naar het hele verhaal.
      </Text>
    ) : (
      <Text {...args} {...(appearance && { appearance })} {...(as && { as })}>
        Hier komen de koppen van de media die over de club schrijven. Elke kop is een link naar de journalist zelf.
      </Text>
    ),
})

export const Intro = meta.story({
  name: 'Inleiding',
  parameters: {
    docs: {
      description: {
        story:
          'De inleiding breekt in balans: de woorden zijn over de regels verdeeld, zodat de regels ongeveer even lang zijn. De inhoud staat in een `b`, die niets zegt over betekenis, dus een schermlezer leest hem niet met nadruk.',
      },
    },
  },
  render: () => (
    <Text appearance="intro">
      We zetten de koppen van de media over sc Heerenveen op één plek, met een link naar het hele verhaal. Een tweede
      zin laat zien hoe de inleiding doorloopt op een volgende regel, met een <a href="/bronnen">link</a> erin.
    </Text>
  ),
})

export const Meta = meta.story({
  name: 'Meta in een regel',
  render: () => (
    <Text appearance="meta">
      <Text appearance="meta" as="span">
        vr 16/10
      </Text>{' '}
      · Omrop Fryslân
    </Text>
  ),
})
