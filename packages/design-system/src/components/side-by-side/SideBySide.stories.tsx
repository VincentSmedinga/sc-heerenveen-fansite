import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { SegmentedControl } from '../segmented-control/SegmentedControl'
import { Text } from '../text/Text'
import { SideBySide } from './SideBySide'

const meta = preview.meta({
  argTypes: {},
  component: SideBySide,
  parameters: {
    docs: {
      description: {
        component: [
          'Twee delen van één taak naast elkaar, zoals een formulier en het voorbeeld van wat het maakt.',
          'Het voorbeeld blijft in beeld terwijl het formulier scrolt. Is er te weinig plaats, dan staat één deel tegelijk en kies je met de tabs welk; het deel dat niet getoond wordt, blijft in de pagina, zodat een formulier zijn waarden houdt.',
          'Hij zet twee delen naast elkaar; op een smal scherm kies je het deel met een `SegmentedControl`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/SideBySide',
})

const tabs = (
  <SideBySide.Tabs>
    <SegmentedControl
      label="Formulier of voorbeeld"
      onChange={() => undefined}
      options={[
        { label: 'Formulier', value: 'formulier' },
        { label: 'Voorbeeld', value: 'voorbeeld' },
      ]}
      value="formulier"
    />
  </SideBySide.Tabs>
)

const form = (
  <Card>
    <Heading level={2}>Formulier</Heading>
    <Text>Hier vul je iets in. Elke wijziging staat meteen in het voorbeeld.</Text>
  </Card>
)

const previewCard = (
  <Card>
    <Heading level={2}>Voorbeeld</Heading>
    <Text>Zo ziet het eruit.</Text>
  </Card>
)

export const Default = meta.story({
  name: 'Formulier en voorbeeld naast elkaar',
  render: () => (
    <SideBySide>
      {tabs}
      <SideBySide.Main>{form}</SideBySide.Main>
      <SideBySide.Aside aria-label="Voorbeeld" tabIndex={0}>
        {previewCard}
      </SideBySide.Aside>
    </SideBySide>
  ),
})
