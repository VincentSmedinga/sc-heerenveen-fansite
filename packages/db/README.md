# @fansite/db

De database van de site en de importer: het schema in TypeScript, de migraties en een seed met testbronnen.
De database is MariaDB 10.11, met Drizzle.
De naam is voorlopig.

## Aan de slag

Je hebt Docker nodig.
Kopieer `.env.example` naar `.env` in de root van de repository, als je dat nog niet deed, en start dan de database:

```sh
cp .env.example .env
docker compose up -d --wait
pnpm db:migrate
pnpm db:seed
```

`docker compose up` start MariaDB 10.11 uit [`compose.yaml`](../../compose.yaml), dezelfde versie als op de hosting en in CI.
De database heeft geen wachtwoord en luistert alleen op je eigen computer.
Stop hem met `docker compose down`.
Wil je opnieuw beginnen, voeg dan `--volumes` toe: dat wist de gegevens.

## Opdrachten

Draai ze vanuit de root van de repository.

| Opdracht           | Wat het doet                                                                    |
| ------------------ | ------------------------------------------------------------------------------- |
| `pnpm db:generate` | Maakt een migratie uit `src/schema.ts` met drizzle-kit, in `drizzle/`           |
| `pnpm db:migrate`  | Voert de migraties uit die de database uit `DATABASE_URL` nog niet had          |
| `pnpm db:seed`     | Zet testbronnen in het register; een tweede keer maakt het geen dubbele bronnen |
| `pnpm test`        | Draait de tests, ook die op een echte MariaDB (zie _Tests_)                     |

`db:migrate` gebruikt de migrator van `drizzle-orm` en niet drizzle-kit.
Daardoor kan dezelfde opdracht later op de hosting draaien, zonder ontwikkelgereedschap.

## Het schema wijzigen

1. Pas `src/schema.ts` aan.
2. Draai `pnpm db:generate --name <beschrijving>`.
3. Controleer de nieuwe SQL in `drizzle/`.
   Eindigt een `CREATE TABLE` niet op `DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, zet dat er dan zelf achter.
   drizzle-kit laat het weg, en MariaDB 10.11 gebruikt anders latin1.
   De tests controleren het voor elke tabel.
4. Zet de SQL en de wijzigingen in `drizzle/meta/` samen met het schema in de commit.

Pas een migratie die al is gedraaid niet meer aan: maak een nieuwe.

## De tabel `sources`

Het bronnenregister legt per bron vast wat we mogen tonen.
Een kop, de link en de naam van de bron mogen altijd, dus daar zit geen kolom voor.
Al het andere staat uit tot de bron toestemming geeft (principe 1 en 2 in het hoofdstuk Redactie van Storybook).

| Kolom                                            | Betekenis                                                                            | Standaard |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ | --------- |
| `name`, `domain`, `kind`                         | De naam, het domein (uniek) en de soort: `news`, `podcast`, `forum`, `club`, `video` | geen      |
| `intro_max_length`                               | Hoeveel tekens van een intro we tonen; 0 is geen intro                               | 0         |
| `allow_image`, `allow_embed`                     | Of we een afbeelding tonen, en of we de bron insluiten                               | onwaar    |
| `attribution`                                    | De bronvermelding zoals de bron die wil; leeg betekent de naam van de bron           | leeg      |
| `consent_status`, `consent_date`, `consent_note` | De toestemming: `none`, `asked` of `given`, sinds welke dag, en wat is afgesproken   | `none`    |
| `enabled`                                        | Zet de bron uit zonder hem te verwijderen                                            | waar      |
| `created_at`                                     | Wanneer de bron is toegevoegd, in UTC                                                | nu        |

Een bron met alleen een naam, een domein en een soort krijgt dus de strengste waarden.
De CHECK-constraint `sources_display_needs_consent` weigert een bron met een intro, een afbeelding of insluiten zolang `consent_status` niet `given` is.
Het geldt voor een nieuwe bron en voor een wijziging, in elke tool.

## Tijden

Tijden staan in UTC, als `datetime`.
De standaardwaarde is `UTC_TIMESTAMP()`, en Drizzle leest en schrijft een `datetime` als UTC.
`consent_date` is een kalenderdag en geen moment.

## Tests

De tests draaien op een echte MariaDB: die van `DATABASE_URL`.
Elk testbestand maakt een eigen database (`fansite_test_…`), draait de migraties erop en haalt hem daarna weg.
De ontwikkeldatabase blijft ongemoeid, maar de gebruiker uit `DATABASE_URL` moet databases mogen maken.

Draait de database niet, dan stoppen de tests met de melding dat ze hem niet kunnen bereiken.
Ze slaan niets over: zo geeft een CI zonder database geen groene vink.

## In andere packages

De exports zijn TypeScript-bronnen, zoals bij de andere packages:

- `@fansite/db/schema`: de tabellen en hun types;
- `@fansite/db/client`: `connect(url)` geeft een Drizzle-verbinding en een functie om hem te sluiten;
- `@fansite/db/env`: het Zod-schema voor `DATABASE_URL`, om in het schema van een app te zetten.
