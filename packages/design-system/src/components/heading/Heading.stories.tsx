import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Text } from '../text/Text'
import { Heading, headingLevels } from './Heading'

const meta = preview.meta({
  argTypes: {
    appearance: {
      control: 'radio',
      description: 'De stijl, als het nummer van de kopstijl. Zonder stijl volgt de kop zijn niveau.',
      options: headingLevels,
    },
    level: {
      control: 'radio',
      description: 'Het niveau in de structuur van de pagina. Verplicht.',
      options: headingLevels,
    },
  },
  component: Heading,
  parameters: {
    // The anchor needs an `id` and an `h2` to `h4`, so it has its own story, not a control.
    controls: { exclude: ['aliases', 'anchor', 'id'] },
    docs: {
      description: {
        component: [
          'Een kop geeft de pagina structuur: wie met een schermlezer door de pagina springt, vindt zijn weg langs de koppen.',
          'Het niveau (`level`) volgt de structuur van de pagina en de stijl (`appearance`) volgt het ontwerp, dus een `h2` kan er uitzien als een kleinere kop.',
          'Een pagina heeft één `h1`, en je slaat geen niveau over.',
          'Met `anchor` is de kop een link naar zichzelf, zodat een bezoeker naar dit deel van de pagina kan linken.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/Heading',
})

export const Default = meta.story({
  args: { level: 2 },
  name: 'Kop',
  render: (args) => <Heading {...args}>Wedstrijden</Heading>,
})

export const Anchor = meta.story({
  name: 'Met een anker',
  parameters: {
    docs: {
      description: {
        story:
          'Een `h2` en een `h3` met een anker, en daaronder een kop zonder. Met een muis staat de ketting er pas bij hover of focus; op een aanraakscherm altijd.',
      },
    },
  },
  render: () => (
    <Card aria-labelledby="voorbeeld-privacy" as="section">
      <Heading anchor id="voorbeeld-privacy" level={2}>
        Privacy
      </Heading>
      <Text>We tellen bezoekers zonder cookies.</Text>
      <Heading anchor id="voorbeeld-cookies" level={3}>
        Wat je browser bewaart
      </Heading>
      <Text>Niets, behalve je keuze voor licht of donker.</Text>
      <Heading level={3}>Een kop zonder anker</Heading>
    </Card>
  ),
})

export const SmallPrint = meta.story({
  name: 'Met kleine tekst',
  parameters: {
    docs: {
      description: {
        story:
          'Een kop kan klein iets bij zich hebben, zoals het nummer van een versie achter de datum. Zet het in een `Text` met `appearance="meta"` en `as="span"`: een schermlezer leest het mee.',
      },
    },
  },
  render: () => (
    <Heading level={2}>
      21 oktober 2026{' '}
      <Text appearance="meta" as="span">
        versie 0.1.0
      </Text>
    </Heading>
  ),
})

// Put the part after the hash in the address, so the heading is the target of the page, as
// after a click on a link. Storybook does not read that part.
const aimAt = (id: string) => () => {
  window.location.hash = ''
  window.location.hash = id
}

export const Target = meta.story({
  name: 'Het doel van een link',
  parameters: {
    docs: {
      description: {
        story:
          'Wie via een link met `#de-stand` komt, ziet welk deel is bedoeld: een pijl aan de beginkant, in de kleur van de focus. Op de pagina met alle voorbeelden is de markering alleen te zien in de losse story.',
      },
    },
  },
  play: aimAt('de-stand'),
  render: () => (
    <Card as="section">
      <Heading anchor id="de-stand" level={2}>
        De stand
      </Heading>
      <Text>Deze kop is het doel van de link: er staat een pijl aan de beginkant.</Text>
      <Heading anchor id="de-uitslagen" level={2}>
        De uitslagen
      </Heading>
    </Card>
  ),
})
