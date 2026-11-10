# @fansite/shared

Hulpfuncties die de site en de importer allebei gebruiken.
De naam is voorlopig.
De keuzes over de hosting en de adressen staan in [`docs/beslissingen/hosting-en-data.md`](../../docs/beslissingen/hosting-en-data.md).

## Omgevingsvariabelen controleren

`parseEnv` controleert bij het opstarten de omgevingsvariabelen met een Zod-schema.
Ontbreekt er een variabele of klopt een waarde niet, dan stopt de app met één foutmelding die ze allemaal noemt.
Een lege waarde telt als ontbrekend, en de foutmelding herhaalt nooit een waarde: het kan een geheim zijn.

```ts
import { parseEnv } from '@fansite/shared/env'
import * as z from 'zod'

export const env = parseEnv(
  z.object({
    DATABASE_URL: z.url(),
  }),
  process.env,
)
```

Elke variabele staat ook in [`.env.example`](../../.env.example), met een regel uitleg.

## Mail versturen

`sendMail` (`@fansite/shared/mail`) verstuurt een mail in platte tekst via de mailserver van de hosting, met TLS.
De site mailt er het contactformulier en de inloglink mee, en de importer de melding dat een import blijft falen (zie de README van de importer).
`readMailEnv` en `readAlertEnv` (`@fansite/shared/mail-env`) lezen de instellingen: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` en `ALERT_MAIL_TO`.
De README van de site beschrijft hoe `sendMail` werkt.

## De regels van een wedstrijdverslag

`checkMatchReport` (`@fansite/shared/match-report`) neemt een verslag (de spelers van beide teams, de wissels, de kaarten, de gemiste strafschoppen, de doelpunten en, bij een beker, de schoten van de strafschoppenserie, die met de uitslag van de serie van de wedstrijd kloppen) met de gegevens van de wedstrijd en geeft de fouten en de waarschuwingen terug, elk met een `code`, een `place` (het onderdeel en de rij) en een Nederlandse `message`.
`blockingIssues` zegt welke fouten het opslaan tegenhouden: bij status `klaar` alle, bij `bezig` alleen die van de opbouw van de gegevens.
`minutesPlayed` rekent de minuten van een speler uit de wissels en de rode kaarten, en `playedMatch` zegt of hij speelde.
`formationProblem` keurt een formatie, zoals `4-3-3`: getallen met een koppelteken ertussen die samen tien zijn, en `formationChoices` is de lijst met de gebruikelijke formaties.
De functies gebruiken geen database; `@fansite/db/match-reports` (`reportForRules`, `matchForRules`) zet een opgeslagen verslag in de vorm die ze lezen.
De regels staan in _De regels voor een verslag staan op één plek, in `packages/shared`_ in [`docs/beslissingen/hosting-en-data.md`](../../docs/beslissingen/hosting-en-data.md).

## De landcodes

`@fansite/shared/countries` heeft de landcodes van twee letters die een persoon kan hebben (`countryCodes`), en `isCountryCode`.
Het zijn de 249 codes van ISO 3166-1 die in gebruik zijn, en `XK` voor Kosovo.
De importer zet er de nationaliteiten van Wikidata mee om, en het beheer maakt er de keuzelijst van het land van (#1051).
Een land dat niet meer bestaat, zoals Joegoslavië, heeft hier geen code.
