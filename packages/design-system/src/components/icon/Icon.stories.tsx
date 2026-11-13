import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { filledIconNames, Icon, type IconName, iconNames } from './Icon'

const meta = preview.meta({
  component: Icon,
  parameters: {
    docs: {
      description: {
        component: [
          'De pictogrammen van het designsysteem: lijntekeningen met ronde uiteinden en hoeken, als SVG in de code. Er komt niets van buiten bij en er is geen pictogrammenbibliotheek.',
          'Je zet een pictogram niet zelf op een pagina: een `Link`, een `Button`, een `IconButton`, een `SegmentedControl`, een `Heading` met een anker en een `Tile` tekenen het voor je.',
          'Bij een link staat het pictogram achter de tekst, omdat het vooruit wijst, en bij een knop ervoor, omdat het zegt wat de knop doet. De zon en de maan hebben ook een gevulde tekening.',
          'Het pictogram heeft de kleur van de tekst eromheen en is verborgen voor hulpsoftware: de naam van een link of knop is zijn tekst alleen, en het pictogram is nooit de enige aanwijzing.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Pictogram',
})

const labels: Record<IconName, string> = {
  'arrow-down': 'Pijl omlaag',
  'arrow-left': 'Pijl naar links',
  'arrow-right': 'Pijl naar rechts',
  'arrow-up': 'Pijl omhoog',
  ball: 'Voetbal',
  camera: 'Camera',
  chart: 'Staafdiagram',
  document: 'Pagina met tekst',
  envelope: 'Envelop',
  'external-link': 'Externe link',
  link: 'Schakel',
  moon: 'Maan',
  plus: 'Plus',
  save: 'Diskette',
  speech: 'Tekstballon',
  sun: 'Zon',
  trash: 'Prullenbak',
}

const cell = (name: string, icon: React.ReactNode, key: string) => (
  <li key={key} style={{ alignItems: 'center', display: 'grid', gap: '0.5rem', justifyItems: 'center' }}>
    <span style={{ fontSize: '2rem', lineHeight: 1 }}>{icon}</span>
    <span className="hf-meta">{name}</span>
  </li>
)

const render = () => (
  <ul
    style={{
      display: 'grid',
      gap: '1.5rem',
      gridTemplateColumns: 'repeat(auto-fill, minmax(8rem, 1fr))',
      listStyle: 'none',
      margin: 0,
      padding: 0,
    }}
  >
    {iconNames.map((name) => cell(labels[name], <Icon name={name} />, name))}
    {filledIconNames.map((name) =>
      cell(`${labels[name]}, gevuld`, <Icon appearance="filled" name={name} />, `${name}-filled`),
    )}
  </ul>
)

export const Default = meta.story({ args: { name: 'ball' }, name: 'Pictogram' })

export const AllIcons = meta.story({ name: 'Alle pictogrammen', render })
