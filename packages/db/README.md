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
De seed zet ook de echte nieuwsbronnen met hun feeds erin (de lijst staat in [`docs/bronnen.md`](../../docs/bronnen.md)) en ons eigen forum, sc Heerenveen Forum; zij staan dus lokaal en op acceptatie in het register, en nooit op productie.
Een feed die over meer gaat dan de club, zoals die van Omrop Fryslân, staat in de seed met `{ filter: 'club', url }`; de seed zet het filter alleen als hij de feed toevoegt (zie de README van de importer, _Het relevantiefilter_).
Hoe echte bronnen op productie komen, beslissen we met het beheer (#30).

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

| Kolom                                            | Betekenis                                                                                          | Standaard |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------- |
| `name`, `domain`, `kind`                         | De naam, het domein (uniek) en de soort: `news`, `podcast`, `forum`, `club`, `video`               | geen      |
| `description`                                    | Wat de bron is, in een of twee zinnen van onszelf, voor de pagina 'Onze bronnen'                   | leeg      |
| `intro_max_length`                               | Hoeveel tekens van een intro we tonen; 0 is geen intro                                             | 0         |
| `allow_image`, `allow_embed`                     | Of we een afbeelding tonen, en of we de bron insluiten                                             | onwaar    |
| `attribution`                                    | De bronvermelding zoals de bron die wil; leeg betekent de naam van de bron                         | leeg      |
| `slug`                                           | De vaste naam in een adres, zoals `omroep-abe`; uniek, en een andere naam verandert het adres niet | leeg      |
| `apple_podcasts_url`, `spotify_url`              | Waar een podcast staat op Apple Podcasts en Spotify; alleen `https`, hoogstens 300 tekens          | leeg      |
| `consent_status`, `consent_date`, `consent_note` | De toestemming: `none`, `asked` of `given`, sinds welke dag, en wat is afgesproken                 | `none`    |
| `enabled`                                        | Zet de bron uit zonder hem te verwijderen                                                          | waar      |
| `created_at`                                     | Wanneer de bron is toegevoegd, in UTC                                                              | nu        |

Een bron met alleen een naam, een domein en een soort krijgt dus de strengste waarden.
De CHECK-constraint `sources_display_needs_consent` weigert een bron met een intro, een afbeelding of insluiten zolang `consent_status` niet `given` is.
Het geldt voor een nieuwe bron en voor een wijziging, in elke tool.

De beschrijving schrijven we zelf; we nemen geen tekst van de bron over.

## De tabellen `feeds` en `items`

De importer (`apps/importer`) schrijft in deze twee tabellen.

`feeds` legt per feed vast welke feeds we lezen, en hoe gezond ze zijn.
Een bron kan meer feeds hebben.

| Kolom                         | Betekenis                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source_id`                   | De bron van de feed; een feed gaat weg als zijn bron wordt verwijderd                                                                                                         |
| `url`                         | Het adres van de feed (hoogstens 500 tekens), uniek                                                                                                                           |
| `etag`, `last_modified`       | De waarden van de vorige keer dat de importer de feed las en de berichten bewaarde                                                                                            |
| `last_success_at`             | De laatste run die de feed las en bewaarde, of hoorde dat hij niet gewijzigd was, in UTC                                                                                      |
| `failures_in_a_row`           | Het aantal mislukte runs op rij; vanaf 3 is de feed ongezond                                                                                                                  |
| `last_error`, `last_error_at` | De reden van de laatste fout (hoogstens 300 tekens) en wanneer die was, in UTC                                                                                                |
| `retry_at`                    | Tot wanneer de importer de feed overslaat: de bron vroeg om te wachten, of hij faalt vaak                                                                                     |
| `filter`                      | `none` voor een feed die alleen over de club gaat (de beginwaarde), `club` voor een feed die over meer gaat; de importer beoordeelt dan elke kop (zie _Het relevantiefilter_) |

Wat als geslaagd of mislukt telt, en hoe lang de importer wacht, staat in de [README van de importer](../../apps/importer/README.md).

`items` legt per bericht vast wat de bron publiceert en we mogen bewaren: de kop, de link en de tijd.
Van een aflevering van een podcast staan er drie feiten bij die geen inhoud zijn: de duur, het seizoen en het nummer.
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
| `duration_seconds`              | De duur van een aflevering in hele seconden; leeg als de feed hem niet geeft, en bij nieuws     |
| `season_number`                 | Het seizoen van een aflevering; leeg als de feed het niet geeft                                 |
| `episode_number`                | Het nummer van een aflevering; leeg als de feed het niet geeft                                  |
| `first_seen_at`, `last_seen_at` | Wanneer we het bericht voor het eerst en het laatst zagen, in UTC                               |
| `hidden_at`                     | Wanneer een moderator het bericht verborg, in UTC; leeg voor een bericht dat te zien is         |
| `hidden_by`                     | Het account dat het verborg (`admin_users`); leeg als het bericht niet verborgen is             |
| `hidden_reason`                 | Waarom, hoogstens 300 tekens; leeg als het bericht niet verborgen is                            |
| `relevance`                     | Wat de importer van de kop vond: `relevant` (de beginwaarde), `doubtful` of `irrelevant`        |

`item_key` is uniek per bron (`source_id` en `item_key` samen) en hoofdlettergevoelig: de kolom heeft de collatie `utf8mb4_bin`, want een `guid` en het pad van een URL kennen hoofdletters.
Een lengte die niet past, geeft een fout in plaats van dat de database de tekst afkapt; de importer slaat zo'n bericht eerder al over.
`itemLimits` in `@fansite/db/schema` heeft de lengtes, voor schema en importer samen.
De importer verwijdert geen berichten.
Een bericht met `hidden_at` laat hij ongemoeid, ook als de bron het opnieuw aanbiedt of verandert (zie _Een bericht verbergen_).

### Het relevantiefilter

`items.relevance` is wat de importer van de kop vindt, voor een feed met `feeds.filter` gelijk aan `club`: `relevant` is over sc Heerenveen, `doubtful` wacht op iemand die ernaar kijkt, `irrelevant` is niet over de club.
Bij een feed met `none` is elk bericht `relevant`.
De importer bewaart elk bericht, ook `doubtful` en `irrelevant`; de regels en de lijst met namen staan in de [README van de importer](../../apps/importer/README.md).
De site toont alleen `relevant`: elke query in `queries.ts` die berichten toont, gaat door `isShown`, samen met `hidden_at IS NULL`.
Een nieuwe query op `items` voor een pagina gebruikt `isShown` ook; het beheer zelf (`listItems`) is de enige die elke waarde toont.
Een migratie zet elk bericht dat er al was op `relevant` en elke feed op `none`.

### Een bericht verbergen

Een moderator verbergt een bericht in het beheer (`/beheer/berichten`); dat zet `hidden_at`, `hidden_by` en `hidden_reason`.
Een bericht dat verborgen is, staat op geen enkele pagina van de site: elke query in `queries.ts` die berichten toont, sluit het uit met `hidden_at IS NULL`.
Een nieuwe query op `items` voor een pagina doet dat ook, en een test per query houdt het vast.
Het bericht blijft in de tabel, zodat de importer het niet opnieuw als nieuw ziet.
De importer overschrijft het niet: de voorwaarde staat in het `INSERT … ON DUPLICATE KEY UPDATE` zelf, dus een bericht dat een moderator verbergt terwijl een run bezig is, blijft ook ongemoeid.
"Toon weer" maakt de drie kolommen leeg.

## De tabel `audit_log`

Het logboek van het beheer: één rij per beheeractie, voor wie later wil weten wat er gebeurde.

| Kolom        | Betekenis                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `created_at` | Wanneer, in UTC                                                                                                           |
| `user_id`    | Wie: het nummer van het account (`admin_users`), geen e-mailadres                                                         |
| `action`     | Wat: `item.hide`, `item.show`, `article.create`, `article.update`, `article.publish` of `article.unpublish`               |
| `item_id`    | Welk bericht, of bij een `article.`-actie welk artikel; zonder foreign key, zodat de rij blijft als het bericht verdwijnt |
| `reason`     | De reden (hoogstens 300 tekens) bij `item.hide`; leeg bij `item.show`                                                     |

Alleen `recordAction` in `apps/site/src/beheer/audit-log.ts` schrijft erin, en alleen met `INSERT`.
Geen enkele code wijzigt of verwijdert een rij, en `audit-log.test.ts` toetst dat in de broncode.
Een account dat in het logboek staat, kan niet uit `admin_users` verdwijnen (een foreign key): `admin:revoke` zet het uit.
Er is nog geen scherm om het logboek te lezen; zie `docs/acceptatieomgeving.md` voor de vraag die het toont.

## De tabel `articles`

De artikelen van onze eigen redactie (zie [`docs/artikelen.md`](../../docs/artikelen.md)).
Een artikel staat op `/redactie/<slug>` en het nieuwste als kaart op de homepage, zodra `published_at` een tijd heeft die niet na het moment van nu ligt.

| Kolom                      | Betekenis                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `slug`                     | Het adres: kleine letters, cijfers en enkele streepjes, hoogstens 80 tekens; uniek                    |
| `title`, `intro`, `author` | De titel (120 tekens), de intro (300) en de naam bij het artikel (100)                                |
| `body`                     | De tekst, in de opmaak van `apps/site/src/article-text.ts`; een `mediumtext`                          |
| `published_at`             | Leeg is een concept; een tijd in de toekomst telt als concept tot die tijd, in UTC                    |
| `created_at`, `updated_at` | Wanneer het artikel is gemaakt en veranderd, in UTC; wie een artikel verandert, zet `updated_at` zelf |
| `created_by`               | Het nummer van het account (`admin_users`), geen e-mailadres; een foreign key zonder cascade          |

De CHECK-constraint `articles_slug_format` weigert een adres met hoofdletters, een underscore of twee streepjes achter elkaar, in elke tool.
Is een tekst te lang voor een kolom, dan faalt de opdracht, zolang MariaDB op zijn standaardinstelling staat (strikt).
Een artikel verwijderen we niet: we trekken het in, door `published_at` leeg te maken.
`findPublishedArticle`, `findNewestArticle` en `listPublishedArticles` in `queries.ts` geven alleen wat gepubliceerd is.

## Het logboek van de import en `robots_txt`

Ook deze drie tabellen vult de importer.

`import_runs` heeft een rij per run van de import.

| Kolom         | Betekenis                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------ |
| `started_at`  | Het begin van de run, in UTC                                                               |
| `finished_at` | Het eind van de run, in UTC; leeg zolang hij bezig is, of als het proces halverwege stopte |
| `lock_taken`  | Of de run de lock bezet vond, en dus niets deed                                            |

`import_results` heeft per run een rij per feed.

| Kolom                                      | Betekenis                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `run_id`, `feed_id`                        | De run en de feed; de rij gaat weg met de run of de feed                                                      |
| `outcome`                                  | `imported`, `not-modified`, `blocked-by-robots`, `wait`, `postponed` of `error`                               |
| `added`, `updated`, `unchanged`, `skipped` | Het aantal nieuwe, bijgewerkte, ongewijzigde en overgeslagen berichten                                        |
| `relevant`, `doubtful`, `irrelevant`       | Hoeveel berichten van de feed het filter bij elke waarde vond; bij een feed zonder filter allemaal `relevant` |
| `reason`                                   | Waarom de feed faalde of wachtte (hoogstens 300 tekens); van de database alleen de code van de fout           |

De importer haalt runs weg die ouder zijn dan 30 dagen.

`robots_txt` bewaart per origin, zoals `https://www.lc.nl`, de regels van `robots.txt` die voor ons gelden.

| Kolom        | Betekenis                                                                          |
| ------------ | ---------------------------------------------------------------------------------- |
| `origin`     | Het schema, de host en de poort, uniek                                             |
| `rules`      | De regels voor `scHeerenveenFansite` of anders `*`, als JSON: `allow` en `pattern` |
| `fetched_at` | Wanneer de fetcher `robots.txt` las, in UTC; na 24 uur leest hij het opnieuw       |

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

- `@fansite/db/schema`: de tabellen (`sources`, `feeds`, `items`, `articles`, `import_runs`, `import_results`, `robots_txt`, `audit_log` en die van het beheer), hun types en de lengtes van `items`;
- `@fansite/db/client`: `connect(url)` geeft een Drizzle-verbinding en een functie om hem te sluiten;
- `@fansite/db/queries`: `listEnabledSources(db)` geeft de bronnen die aanstaan, op naam, met hun beschrijving en zonder het beleid of de toestemming;
  `listRecentItems(db, { limit, until })` geeft de nieuwste `limit` berichten van die bronnen tot en met `until` (geef het moment van nu mee, want een tijd in de toekomst hoort er niet), het nieuwste eerst, met alleen de kop, de link, de tijd, de betaalmuur en de bronnaam (de `attribution`, of anders de naam), en geen afleveringen van bronnen van het soort podcast;
  `listPodcastEpisodes(db, { limit, offset, podcast, until })` geeft juist de afleveringen van de podcasts die aanstaan, het nieuwste eerst, met alleen de titel, de link, de tijd, de naam van de podcast en de duur, het seizoen en het nummer van de aflevering, en `countPodcastEpisodes` geeft het totaal; `podcast` is de `slug` van één podcast;
  `findPublishedArticle(db, slug, until)`, `findNewestArticle(db, until)` en `listPublishedArticles(db, until)` geven de gepubliceerde artikelen van de redactie (zie _De tabel `articles`_);
  `listPodcasts(db)` geeft de podcasts met een `slug` en minstens één aflevering, voor het filter, en `findPodcast(db, slug)` geeft de naam, de beschrijving en de adressen bij Apple Podcasts en Spotify van één podcast;
- `@fansite/db/test-database`: `createTestDatabase()` maakt een eigen database met de migraties erop, voor tests in andere packages (zie _Tests_);
- `@fansite/db/env`: het Zod-schema voor `DATABASE_URL`, om in het schema van een app te zetten;
- `@fansite/db/lock`: `withLock(pool, name, waitSeconds, task)` doet een taak terwijl het een slot in de database houdt (`GET_LOCK`), en `lockNameFor(url, task)` geeft de naam daarvan, met de taak en de naam van de database erin.
  De migraties en de import gebruiken het, elk met een eigen naam;
- `@fansite/db/prepare`: `prepareDatabase({ migrationsFolder, seed, url })` draait de migraties die de database nog niet had en zet op verzoek de bronnen uit de seed erin.
  Een slot in de database (`fansite_migrate_<database>`) laat twee processen die tegelijk starten, om de beurt werken.
  De site roept het aan als hij start.
  De functie gooit bij een fout en laat het aan de aanroeper wat dat betekent; de aanroeper geeft zelf de map met de migraties, want een gebundelde build weet niet waar die staat.
