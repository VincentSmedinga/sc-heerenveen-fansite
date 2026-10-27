import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Text } from '../text/Text'
import { Link, linkIcons } from './Link'

const meta = preview.meta({
  argTypes: {
    href: {
      control: 'text',
      description: 'Waar de link heen gaat. Verplicht.',
    },
    icon: {
      control: 'radio',
      description: 'Een pictogram bij de tekst. De link heet voor een schermlezer zijn tekst alleen.',
      options: Object.keys(linkIcons),
    },
  },
  component: Link,
  parameters: {
    docs: {
      description: {
        component: [
          'Een link brengt de bezoeker naar een andere pagina, en is altijd onderstreept.',
          'De tekst zegt waar de link heen gaat, ook los van de zin eromheen; dus geen "lees meer" of "klik hier".',
          'Met `icon` zet je een pictogram bij de tekst, voor een link naar meer, naar buiten de site, naar een mail of terug.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/Link',
})

export const Default = meta.story({
  args: { href: '#verslag-omrop-fryslan' },
  name: 'Link',
  render: (args) => (
    <Text>
      Lees het hele verslag bij <Link {...args}>Omrop Fryslân</Link> of bekijk de samenvatting bij{' '}
      <Link href="#samenvatting-eredivisie">de eredivisie</Link>.
    </Text>
  ),
})

export const Icons = meta.story({
  name: 'Met een pictogram',
  parameters: {
    docs: {
      description: {
        story: [
          'Een pictogram staat achter de tekst, omdat het vooruit wijst, naar waar de link heen gaat: `arrow-right` voor meer of alles, `external-link` voor elke link die de site verlaat.',
          'Er zijn twee uitzonderingen, die vóór de tekst staan: `arrow-left`, omdat hij achteruit wijst, en `envelope`, omdat hij zegt wat de link doet.',
        ].join(' '),
      },
    },
  },
  render: () => (
    <>
      <Text>
        <Link href="#alle-podcasts" icon="arrow-right">
          Alle podcasts
        </Link>
      </Text>
      <Text>
        Bij de site hoort ook{' '}
        <Link href="https://forum.heerenveen.org" icon="external-link">
          ons forum
        </Link>
        , waar supporters met elkaar praten.
      </Text>
      <Text>
        Mis je een bron? Mail ons via{' '}
        <Link href="mailto:fansite@heerenveen.org" icon="envelope">
          fansite@heerenveen.org
        </Link>
        .
      </Text>
      <Text>
        <Link href="#vorige" icon="arrow-left">
          Vorige
        </Link>
      </Text>
    </>
  ),
})

export const States = meta.story({
  name: 'Toestanden',
  parameters: {
    docs: {
      description: {
        story:
          'Bezocht, muis en focus zijn nagebootst met de add-on Pseudo States. Een bezochte link ziet er hetzelfde uit als een link die je nog niet hebt geopend; alleen de kop van een nieuwsbericht en de titel van een discussie worden grijs. Onder de muis wordt de lijn dikker.',
      },
    },
    pseudo: {
      focusVisible: ['[data-example="focus"]'],
      hover: ['[data-example="hover"]'],
      visited: ['[data-example="visited"]'],
    },
  },
  render: () => (
    <>
      <Text>
        <Link href="#nog-niet-bezocht">Gewone link</Link>
      </Text>
      <Text>
        <Link data-example="visited" href="#al-bezocht">
          Bezochte link
        </Link>
      </Text>
      <Text>
        <Link data-example="hover" href="#onder-de-muis">
          Link onder de muis
        </Link>
      </Text>
      <Text>
        <Link data-example="focus" href="#met-focus">
          Link met focus
        </Link>
      </Text>
    </>
  ),
})
