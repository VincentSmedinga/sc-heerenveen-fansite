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
          'Het voorbeeld blijft in beeld terwijl het formulier scrolt. Is er te weinig plaats, dan staat één deel tegelijk en kies je met de tabs welk.',
          'Het deel dat niet getoond wordt, blijft in de pagina, zodat een formulier zijn waarden houdt.',
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

export const OnePartAtATime = meta.story({
  name: 'Eén deel tegelijk op een smal scherm',
  parameters: {
    docs: { description: { story: 'Het voorbeeld heeft `hidden`: het formulier is het deel dat je ziet.' } },
  },
  render: () => (
    <div style={{ inlineSize: '24rem', maxInlineSize: '100%' }}>
      <SideBySide>
        {tabs}
        <SideBySide.Main>{form}</SideBySide.Main>
        <SideBySide.Aside aria-label="Voorbeeld" hidden tabIndex={0}>
          {previewCard}
        </SideBySide.Aside>
      </SideBySide>
    </div>
  ),
})
