import preview from '#.storybook/preview'

import { filledIconNames, Icon, type IconName, iconNames } from './Icon'

const meta = preview.meta({
  component: Icon,
  parameters: {
    docs: {
      description: {
        component: [
          'De pictogrammen van het designsysteem: een pijl naar rechts, een pijl naar links, een envelop, het pictogram voor een externe link, een schakel van een ketting, een plus, een zon en een maan.',
          'We tekenen ze zelf, als SVG in de code. Er komt niets van buiten bij en er is geen pictogrammenbibliotheek.',
          'Je zet een pictogram niet zelf op een pagina: een `Link`, een `Button`, een `SegmentedControl` en een `Heading` met een anker tekenen het voor je.',
          '',
          '**De stijl.**',
          'Een pictogram is een lijn met ronde uiteinden en ronde hoeken, zonder vulling, en het blijft binnen zijn vierkant.',
          'De lijn is even dik als de letters van gewone tekst, ook als het pictogram groter is, dus pictogram en tekst lijken bij elkaar te horen.',
          'De lijn komt halverwege de kleine letters te staan, zoals de dwarsbalk van de e.',
          'Een volgend pictogram krijgt dezelfde lijn, hetzelfde vierkant en dezelfde hoeken.',
          'De zon en de maan hebben twee tekeningen: alleen de lijn, en gevuld.',
          'De gevulde tekening is dezelfde lijn met de vorm opgevuld in de kleur van de tekst, zodat de twee één stijl houden.',
          '',
          '**Kleur en grootte.**',
          'Een pictogram heeft altijd de kleur van de tekst eromheen, ook onder de muis, met de focus en in geforceerde kleuren, dus het heeft hetzelfde contrast als die tekst.',
          'Het is iets kleiner dan de tekst en groeit en krimpt met die tekst.',
          'In een knop is het iets groter, omdat de tekst van een knop vet is.',
          'Het beweegt niet.',
          '',
          '**Voor of achter de tekst.**',
          'Bij een link staat het pictogram achter de tekst, omdat het vooruit wijst: naar waar de link heen gaat.',
          'Bij een knop staat het ervoor, omdat het zegt wat de knop doet.',
          'Er zijn twee uitzonderingen bij een link, en die staan ervoor: "Vorige", omdat zijn pijl naar links wijst, en de envelop bij een e-mailadres, omdat hij zegt wat de link doet: een mail openen.',
          'Het pictogram blijft aan het eerste of laatste woord vast als de regel afbreekt, zodat het niet alleen op een regel komt.',
          '',
          '**Toegankelijkheid.**',
          'De naam van een link of een knop is zijn tekst alleen: het pictogram is verborgen voor hulpsoftware.',
          'Het is nooit de enige aanwijzing voor iets. De gevulde zon of maan op een ingedrukte knop is een tweede aanwijzing naast `aria-pressed`.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Pictogram',
})

const labels: Record<IconName, string> = {
  'arrow-left': 'Pijl naar links',
  'arrow-right': 'Pijl naar rechts',
  envelope: 'Envelop',
  'external-link': 'Externe link',
  link: 'Schakel',
  moon: 'Maan',
  plus: 'Plus',
  sun: 'Zon',
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

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Alle pictogrammen, licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Alle pictogrammen, donker', render })

const sunAndMoon = () => (
  <ul
    style={{
      alignItems: 'center',
      display: 'flex',
      flexWrap: 'wrap',
      fontSize: '2rem',
      gap: '1.5rem',
      listStyle: 'none',
      margin: 0,
      padding: 0,
    }}
  >
    <li>
      <Icon name="sun" />
    </li>
    <li>
      <Icon appearance="filled" name="sun" />
    </li>
    <li>
      <Icon name="moon" />
    </li>
    <li>
      <Icon appearance="filled" name="moon" />
    </li>
  </ul>
)

export const SunAndMoonLight = meta.story({
  globals: { theme: 'light' },
  name: 'Zon en maan, lijn en gevuld, licht',
  render: sunAndMoon,
})

export const SunAndMoonDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Zon en maan, lijn en gevuld, donker',
  render: sunAndMoon,
})
