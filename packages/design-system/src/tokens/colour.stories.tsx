import preview from '#.storybook/preview'

import { ColourScales, ContrastTables, SemanticTokenTable } from '../docs/ColourDocs'

const meta = preview.meta({
  title: 'Tokens/Kleur',
})

export const Primitives = meta.story({
  name: 'Reeksen',
  render: () => <ColourScales />,
})

export const SemanticTokens = meta.story({
  name: 'Rollen',
  render: () => <SemanticTokenTable />,
})

export const Contrast = meta.story({
  name: 'Contrast',
  render: () => (
    <>
      <ContrastTables theme="light" />
      <ContrastTables theme="dark" />
    </>
  ),
})
