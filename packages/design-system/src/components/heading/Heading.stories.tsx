import preview from '#.storybook/preview'

import { Heading } from './Heading'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een kop.',
          'Het niveau (`level`, van 1 tot en met 4) volgt de structuur van de pagina, en de stijl (`appearance`, ook van 1 tot en met 4) volgt het ontwerp.',
          'Zonder `appearance` heeft de kop de stijl van zijn niveau.',
          '',
          'Een pagina heeft één `h1`, en je slaat geen niveau over: na een `h2` komt een `h2` of een `h3`.',
          'De niveaus 5 en 6 bestaan hier nog niet, omdat ze nog geen eigen stijl hebben.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Heading',
})

const render = () => (
  <>
    <Heading level={1}>Nieuws over sc Heerenveen</Heading>
    <Heading level={2}>Wedstrijden</Heading>
    <Heading level={3}>Volgende wedstrijd</Heading>
    <Heading level={4}>Hoe we bronnen kiezen</Heading>
  </>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

export const StyleApartFromLevel = meta.story({
  name: 'Stijl los van niveau',
  parameters: {
    docs: {
      description: {
        story:
          'De titel van een blok in de zijbalk is een `h2`, want het blok hangt direct onder de paginatitel. Met `appearance={3}` ziet die kop eruit als Kop 3.',
      },
    },
  },
  render: () => (
    <section aria-labelledby="discussies" className="_hf-docs-card" style={{ maxInlineSize: '24rem' }}>
      <Heading appearance={3} id="discussies" level={2}>
        Nieuwste discussies
      </Heading>
      <Heading appearance={4} level={3}>
        Een kop onder de titel
      </Heading>
    </section>
  ),
})
