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
