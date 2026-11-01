# @fansite/shared

Hulpfuncties die de site en de importer allebei gebruiken.
De naam is voorlopig.

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
