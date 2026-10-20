import preview from '#.storybook/preview'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component:
          'Formulierelementen zonder component: label, invoerveld, keuzelijst, tekstvak, vinkje, keuzerondje en knop. Velden en knoppen zijn minstens 44 pixels hoog. De rand van een veld haalt 3:1.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Formulier',
})

export const RemovalRequest = meta.story({
  name: 'Verwijderverzoek',
  render: () => (
    <form onSubmit={(event) => event.preventDefault()} style={{ maxInlineSize: '30rem' }}>
      <label htmlFor="naam">Naam</label>
      <input autoComplete="name" id="naam" name="naam" type="text" />

      <label htmlFor="e-mail">E-mailadres</label>
      <input autoComplete="email" id="e-mail" name="e-mail" type="email" />

      <label htmlFor="onderwerp">Onderwerp</label>
      <select defaultValue="verwijderen" id="onderwerp" name="onderwerp">
        <option value="verwijderen">Een bericht laten verwijderen</option>
        <option value="fout">Een fout in een bericht</option>
        <option value="bron">Een bron voorstellen</option>
        <option value="anders">Iets anders</option>
      </select>

      <label htmlFor="link">Link naar het bericht</label>
      <input id="link" name="link" type="url" />

      <label htmlFor="toelichting">Toelichting</label>
      <textarea id="toelichting" name="toelichting" rows={4} />

      <fieldset>
        <legend>Mogen we je mailen over je verzoek?</legend>
        <div>
          <input defaultChecked id="mailen-ja" name="mailen" type="radio" value="ja" />
          <label htmlFor="mailen-ja">Ja, graag</label>
        </div>
        <div>
          <input id="mailen-nee" name="mailen" type="radio" value="nee" />
          <label htmlFor="mailen-nee">Nee, dat hoeft niet</label>
        </div>
      </fieldset>

      <p>
        <input id="kopie" name="kopie" type="checkbox" />
        <label htmlFor="kopie">Stuur mij een kopie van dit verzoek</label>
      </p>

      <button type="submit">Versturen</button>
    </form>
  ),
})
