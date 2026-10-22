# @fansite/db

De database van de site en de importer: het schema in TypeScript, de migraties en een seed met testbronnen en de eerste echte bron.
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

| Opdracht           | Wat het doet                                                                         |
| ------------------ | ------------------------------------------------------------------------------------ |
| `pnpm db:generate` | Maakt een migratie uit `src/schema.ts` met drizzle-kit, in `drizzle/`                |
| `pnpm db:migrate`  | Voert de migraties uit die de database uit `DATABASE_URL` nog niet had               |
| `pnpm db:seed`     | Zet de bronnen met hun feeds in het register; een tweede keer maakt het geen dubbele |
| `pnpm test`        | Draait de tests, ook die op een echte MariaDB (zie _Tests_)                          |

`db:migrate` gebruikt de migrator van `drizzle-orm` en niet drizzle-kit.
Daardoor kan dezelfde code op de hosting draaien, zonder ontwikkelgereedschap: de site doet dat als hij start (zie _In andere packages_).

`db:seed` weigert als `SITE_ENV` `production` is, want de testbronnen zijn verzonnen en mogen daar nooit komen.
De seed zet ook de Leeuwarder Courant met haar feed erin; zij staat dus lokaal en op acceptatie in het register, en nooit op productie.
Hoe echte bronnen op productie komen, beslissen we met de bronnenlijst (#10) en het beheer (#30).

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
| `description`                                    | Wat de bron is, in een of twee zinnen van onszelf, voor de pagina 'Onze bronnen'     | leeg      |
| `intro_max_length`                               | Hoeveel tekens van een intro we tonen; 0 is geen intro                               | 0         |
| `allow_image`, `allow_embed`                     | Of we een afbeelding tonen, en of we de bron insluiten                               | onwaar    |
| `attribution`                                    | De bronvermelding zoals de bron die wil; leeg betekent de naam van de bron           | leeg      |
| `consent_status`, `consent_date`, `consent_note` | De toestemming: `none`, `asked` of `given`, sinds welke dag, en wat is afgesproken   | `none`    |
| `enabled`                                        | Zet de bron uit zonder hem te verwijderen                                            | waar      |
| `created_at`                                     | Wanneer de bron is toegevoegd, in UTC                                                | nu        |

Een bron met alleen een naam, een domein en een soort krijgt dus de strengste waarden.
De CHECK-constraint `sources_display_needs_consent` weigert een bron met een intro, een afbeelding of insluiten zolang `consent_status` niet `given` is.
Het geldt voor een nieuwe bron en voor een wijziging, in elke tool.

De beschrijving schrijven we zelf; we nemen geen tekst van de bron over.

## De tabellen `feeds` en `items`

De importer (`apps/importer`) schrijft in deze twee tabellen.

`feeds` legt per feed vast welke feeds we lezen.
Een bron kan meer feeds hebben.

| Kolom                   | Betekenis                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `source_id`             | De bron van de feed; een feed gaat weg als zijn bron wordt verwijderd              |
| `url`                   | Het adres van de feed (hoogstens 500 tekens), uniek                                |
| `etag`, `last_modified` | De waarden van de vorige keer dat de importer de feed las en de berichten bewaarde |

`items` legt per bericht vast wat de bron publiceert en we mogen bewaren: de kop, de link en de tijd.
Een intro, een afbeelding, een auteur of een categorie heeft geen kolom, want geen bron heeft daar nu toestemming voor (principe 2 van de Redactie).
Een kolom daarvoor komt met de eerste bron die het wel mag; een test houdt de lijst met kolommen vast.

| Kolom                           | Betekenis                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `source_id`, `feed_id`          | De bron en de feed waar het bericht voor het laatst in stond                                    |
| `item_key`                      | De sleutel per bron: de `guid` van het bericht, of anders de link (hoogstens 700 tekens)        |
| `title`                         | De kop als tekst (hoogstens 500 tekens)                                                         |
| `url`                           | De link, altijd `http` of `https` (hoogstens 2048 tekens)                                       |
| `published_at`                  | De tijd van publicatie, in UTC; zonder geldige tijd de tijd van de eerste keer dat we het zagen |
| `paywalled`                     | Of het bericht achter de betaalmuur staat; een kenmerk van het bericht en geen inhoud           |
| `first_seen_at`, `last_seen_at` | Wanneer we het bericht voor het eerst en het laatst zagen, in UTC                               |

`item_key` is uniek per bron (`source_id` en `item_key` samen) en hoofdlettergevoelig: de kolom heeft de collatie `utf8mb4_bin`, want een `guid` en het pad van een URL kennen hoofdletters.
Een lengte die niet past, geeft een fout in plaats van dat de database de tekst afkapt; de importer slaat zo'n bericht eerder al over.
`itemLimits` in `@fansite/db/schema` heeft de lengtes, voor schema en importer samen.
De importer verwijdert geen berichten.

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

- `@fansite/db/schema`: de tabellen (`sources`, `feeds`, `items`), hun types en de lengtes van `items`;
- `@fansite/db/client`: `connect(url)` geeft een Drizzle-verbinding en een functie om hem te sluiten;
- `@fansite/db/queries`: `listEnabledSources(db)` geeft de bronnen die aanstaan, op naam, met hun beschrijving en zonder het beleid of de toestemming;
  `listRecentItems(db, since)` geeft de berichten van die bronnen vanaf `since`, het nieuwste eerst, met alleen de kop, de link, de tijd, de betaalmuur en de bronnaam (de `attribution`, of anders de naam);
- `@fansite/db/test-database`: `createTestDatabase()` maakt een eigen database met de migraties erop, voor tests in andere packages (zie _Tests_);
- `@fansite/db/env`: het Zod-schema voor `DATABASE_URL`, om in het schema van een app te zetten;
- `@fansite/db/prepare`: `prepareDatabase({ migrationsFolder, seed, url })` draait de migraties die de database nog niet had en zet op verzoek de bronnen uit de seed erin.
  Een slot in de database (`GET_LOCK`, met de naam van de database erin) laat twee processen die tegelijk starten, om de beurt werken.
  De site roept het aan als hij start.
  De functie gooit bij een fout en laat het aan de aanroeper wat dat betekent; de aanroeper geeft zelf de map met de migraties, want een gebundelde build weet niet waar die staat.
