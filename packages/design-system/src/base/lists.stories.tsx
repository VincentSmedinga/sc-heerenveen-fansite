import preview from '#.storybook/preview'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component:
          'Opsommingen met vierkante tekens, zoals op de oude fansite, genummerde lijsten en definitielijsten.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Lijsten',
})

export const Unordered = meta.story({
  name: 'Opsomming',
  render: () => (
    <ul>
      <li>Nieuws over sc Heerenveen uit de media</li>
      <li>Officieel clubnieuws</li>
      <li>De nieuwste discussies op het forum</li>
      <li>
        Podcasts over de club
        <ul>
          <li>Sportcast</li>
          <li>Omroep Abe</li>
        </ul>
      </li>
    </ul>
  ),
})

export const Ordered = meta.story({
  name: 'Genummerde lijst',
  render: () => (
    <ol>
      <li>Stuur ons de link naar het bericht dat weg moet.</li>
      <li>Vertel erbij wie je bent en waarom het weg moet.</li>
      <li>We halen het bericht weg en laten je weten wanneer dat is gebeurd.</li>
    </ol>
  ),
})

export const Description = meta.story({
  name: 'Definitielijst',
  render: () => (
    <dl>
      <dt>Pompeblêden</dt>
      <dd>De rode bladeren van de waterlelie in de Friese vlag, ook op het shirt van sc Heerenveen.</dd>
      <dt>Abe Lenstra Stadion</dt>
      <dd>Het stadion van sc Heerenveen, genoemd naar de beroemdste speler van de club.</dd>
      <dt>It Hearrenfean</dt>
      <dd>De Friese naam van Heerenveen.</dd>
    </dl>
  ),
})
