# @fansite/db

De database van de site en de importer: het schema in TypeScript, de migraties en een seed met testbronnen voor lokaal gebruik en de echte bronnen.
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

| Opdracht           | Wat het doet                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:generate` | Maakt een migratie uit `src/schema.ts` met drizzle-kit, in `drizzle/`                                               |
| `pnpm db:migrate`  | Voert de migraties uit die de database uit `DATABASE_URL` nog niet had                                              |
| `pnpm db:seed`     | Zet de testbronnen, de echte bronnen met hun feeds en de hoofdtrainers erin; een tweede keer maakt het geen dubbele |
| `pnpm db:backup`   | Maakt een gecomprimeerde dump van de database uit `DATABASE_URL` in `BACKUP_FOLDER` (zie _Back-ups_)                |
| `pnpm db:restore`  | Zet een dump terug in een lege database (zie _Back-ups_)                                                            |
| `pnpm test`        | Draait de tests, ook die op een echte MariaDB (zie _Tests_)                                                         |

`db:migrate` gebruikt de migrator van `drizzle-orm` en niet drizzle-kit.
Daardoor kan dezelfde code op de hosting draaien, zonder ontwikkelgereedschap: de site doet dat als hij start (zie _In andere packages_).

De seed heeft twee lijsten in `src/seed.ts`:

- `testSources` zijn de verzonnen bronnen met verschillende beleiden en toestemmingen, voor lokaal gebruik en de tests.
  Ze staan alleen lokaal in het register, en niet op acceptatie of productie.
- `realSources` zijn de echte bronnen met hun feeds, zoals de nieuwsbronnen (de lijst staat in [`docs/bronnen.md`](../../docs/bronnen.md)), de podcasts en ons eigen forum, sc Heerenveen Forum.
  Ze staan op elke omgeving in het register.

`db:seed` zet allebei erin en weigert als `SITE_ENV` `production` is: wat de site bij het opstarten doet, is daar de enige weg.
Met `SITE_ENV=acceptance` of `production` zet de site alleen `realSources` in het register (`seedRealSources`) en de hoofdtrainers in `staff` (`seedStaff`).
Een bron die er al staat, werkt hij bij op haar domein, behalve wat het beheer straks wijzigt: `enabled`, de velden `consent_*`, `attribution` en het beleid voor intro, foto en insluiten.
Op acceptatie haalt de site ook de testbronnen weg die er voor 26 oktober 2026 stonden (`removeTestSources`).
Hij herkent ze aan hun domein uit `testSources`, en verwijdert die rijen met hun feeds en berichten; een echte bron blijft ongemoeid.
Zodra het beheer (#31) bronnen kan toevoegen, verdwijnt `realSources` uit de seed.
Een feed die over meer gaat dan de club, zoals die van Omrop Fryslân, NOS, het Algemeen Dagblad en ESPN, staat in de seed met `{ filter: 'club', url }`; de seed zet het filter alleen als hij de feed toevoegt (zie de README van de importer, _Het relevantiefilter_).

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

| Kolom                      | Betekenis                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `slug`                     | Het adres: kleine letters, cijfers en enkele streepjes, hoogstens 80 tekens; uniek                                    |
| `title`, `intro`, `author` | De titel (120 tekens), de intro (300) en de naam bij het artikel (100)                                                |
| `body`                     | De tekst, in de opmaak van `apps/site/src/article-text.ts`; een `mediumtext`                                          |
| `published_at`             | Leeg is een concept; een tijd in de toekomst telt als concept tot die tijd, in UTC                                    |
| `created_at`, `updated_at` | Wanneer het artikel is gemaakt en veranderd, in UTC; wie een artikel verandert, zet `updated_at` en `updated_by` zelf |
| `created_by`               | Het nummer van het account (`admin_users`), geen e-mailadres; een foreign key zonder cascade                          |
| `updated_by`               | Het account dat het artikel het laatst veranderde, ook bij publiceren en intrekken; verplicht                         |

De CHECK-constraint `articles_slug_format` weigert een adres met hoofdletters, een underscore of twee streepjes achter elkaar, in elke tool.
Is een tekst te lang voor een kolom, dan faalt de opdracht, zolang MariaDB op zijn standaardinstelling staat (strikt).
Een artikel verwijderen we niet: we trekken het in, door `published_at` leeg te maken.
`findPublishedArticle`, `findNewestArticle` en `listPublishedArticles` in `queries.ts` geven alleen wat gepubliceerd is.

## De tabel `article_versions`

Elke versie van de tekst van een artikel (zie [`docs/artikelen.md`](../../docs/artikelen.md), _Wat het beheer bewaart_).
Het beheer voegt een rij toe bij elke keer dat het een artikel maakt of de tekst verandert, in dezelfde transactie als de wijziging.

| Kolom                                      | Betekenis                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `article_id`                               | Het artikel; een foreign key zonder cascade                                                  |
| `version`                                  | 1, 2, 3 per artikel, aaneengesloten; de sleutel `(article_id, version)` is uniek             |
| `title`, `slug`, `intro`, `body`, `author` | De inhoud zoals hij toen was opgeslagen; de nieuwste versie is gelijk aan het artikel zelf   |
| `saved_at`                                 | Wanneer, in UTC                                                                              |
| `saved_by`                                 | Het nummer van het account (`admin_users`), geen e-mailadres; een foreign key zonder cascade |

Wat de tabel bewaart: de inhoud van elke opgeslagen versie, wie hem opsloeg en wanneer.
Wat ze niet bewaart: de publicatiestand (`published_at`), want publiceren en intrekken veranderen de tekst niet; die staan in het logboek (`article.publish` en `article.unpublish`).
Een artikel dat alleen met SQL is veranderd, heeft van die wijziging geen versie.

Alleen `recordVersion` in `apps/site/src/beheer/article-versions.ts` schrijft erin, en alleen met `INSERT`.
Geen enkele code wijzigt of verwijdert een rij, en `article-versions.test.ts` toetst dat in de broncode.
Het nummer van een nieuwe versie komt uit dezelfde opdracht die de rij toevoegt (het hoogste nummer plus één), terwijl de rij van het artikel vergrendeld is.
De unieke sleutel weigert een dubbel nummer als dat toch gebeurt.

Migratie `0013_add_article_versions` voegt `updated_by` toe (eerst leeg, gevuld uit `created_by`, dan verplicht) en zet voor elk artikel dat er al was een versie 1.
Elke opdracht ervan kan opnieuw draaien, want MariaDB kan een `ALTER TABLE` niet terugdraaien: stopt de migratie halverwege, dan maakt de volgende start hem af.

## De tabellen voor het tellen van bezoeken

De site telt paginaweergaven en unieke bezoekers per dag, zonder iemand te volgen (zie _We tellen paginaweergaven en unieke bezoekers per dag_ in [`docs/beslissingen.md`](../../docs/beslissingen.md)).
Een dag is een dag in Nederland (Europe/Amsterdam).

| Tabel            | Wat erin staat                                                                              | Blijft het?                |
| ---------------- | ------------------------------------------------------------------------------------------- | -------------------------- |
| `page_views`     | Een teller per dag en per pad (`views`); het pad heeft geen zoekvraag                       | Ja                         |
| `daily_visitors` | Een teller per dag (`visitors`): het aantal verschillende bezoekers                         | Ja                         |
| `visitor_salts`  | Het zout van de dag: 32 willekeurige bytes in hex                                           | Nee, tot de dag voorbij is |
| `visitor_hashes` | De HMAC-SHA-256 (hex) van het IP-adres en de browsertekst, met het zout van de dag, per dag | Nee, tot de dag voorbij is |

Alleen `createVisitCounter(db).record(...)` in `src/visits.ts` schrijft in de tabellen, en `removeVisitorData(db, now)` haalt het zout en de kenmerken weg van alle dagen vóór vandaag.
De site roept de eerste aan, in de proxy.
De tweede draait bij het eerste verzoek van een nieuwe dag in een proces en bij elke run van de import.
Het IP-adres en de browsertekst staan in geen enkele tabel; `visits.test.ts` zoekt in alle tabellen naar beide.
De klikken op links (#292) en de cijfers in het beheer (#293) bouwen hierop.

## Back-ups

`pnpm db:backup` en `pnpm db:restore <bestand>` maken een dump en zetten hem terug (`src/backup.ts`).
Op de host draait cron elke nacht hetzelfde, als `packages/db/backup.mjs` dat `assemble` maakt.
De dump bevat van `visitor_salts`, `visitor_hashes`, `discussions`, `admin_sessions` en `admin_login_links` alleen de structuur, want die gegevens bewaren we niet 14 dagen (zie `docs/back-ups.md`).
Hoe het werkt, hoe je het op de host instelt, hoe je terugzet en wat het aan opslag kost, staat in [`docs/back-ups.md`](../../docs/back-ups.md).
`BACKUP_FOLDER`, `BACKUP_KEEP_DAYS`, `MYSQLDUMP_COMMAND` en `MYSQL_COMMAND` staan in `.env.example`.
De tests (`src/backup.test.ts`) geven de opdrachten kleine programma's in plaats van `mysqldump` en `mysql`, en hebben voor het terugzetten een MariaDB nodig.

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

## De wedstrijden en de stand

De importer vult deze vier tabellen met de gegevens van de Nederlandse Wikipedia (zie de [README van de importer](../../apps/importer/README.md), _De wedstrijden en de stand_).
Ze gelden voor sc Heerenveen 1 (mannen).
Een seizoen begint op 1 juli en staat als `2026/27` in `season`; `seasonOf` en `seasonStart` in `@fansite/db/season` rekenen het uit.
Een rij van een eerder seizoen verandert of verdwijnt nooit.

`matches` heeft een rij per wedstrijd.

| Kolom                                | Betekenis                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `season`, `competition`              | Het seizoen en de competitie: `Eredivisie` of `KNVB Beker`                                                   |
| `round`                              | De ronde zoals Wikipedia die noemt, zoals `Speelronde 12` of `Eerste ronde`; uniek per seizoen en competitie |
| `opponent`, `home`, `stadium`        | De tegenstander zoals Wikipedia hem schrijft, of de wedstrijd thuis is, en het stadion (kan ontbreken)       |
| `club_id`                            | De tegenstander als club (zie _De tabellen `clubs` en `club_names`_); verplicht                              |
| `status`                             | `scheduled`, `played` of `postponed`                                                                         |
| `goals_for`, `goals_against`         | De doelpunten van sc Heerenveen en van de tegenstander; alleen gevuld bij `played`                           |
| `extra_time`                         | Of een gespeelde bekerwedstrijd in verlenging ging; anders `false`                                           |
| `penalties_for`, `penalties_against` | De strafschoppen van sc Heerenveen en van de tegenstander; leeg zonder strafschoppen, anders allebei gevuld  |
| `match_date`                         | De dag in Nederland, of de eerste dag als alleen een weekend bekend is                                       |
| `kickoff_at`                         | De aftrap in UTC; leeg zolang de tijd niet bekend is                                                         |
| `date_text`                          | De datum zoals Wikipedia die geeft, zoals `12-14 februari 2027`; gevuld als er geen aftrap is                |
| `result_set_at`                      | Sinds wanneer de uitslag zo staat, in UTC; de import vergelijkt dat met drie dagen                           |

Vijf CHECK-constraints houden de rijen heel:

- een uitslag hoort bij `played` en nergens anders (`matches_result_only_when_played`);
- een wedstrijd heeft een aftrap of een tekst voor de datum (`matches_time_or_text`);
- verlenging hoort bij een gespeelde bekerwedstrijd en nergens anders (`matches_extra_time_only_in_played_cup`);
- strafschoppen komen in een paar (`matches_penalties_in_a_pair`);
- strafschoppen horen bij verlenging en een gelijke stand (`matches_penalties_after_level_extra_time`).

`goals_for` en `goals_against` blijven de stand zoals Wikipedia die geeft, zonder de strafschoppen.

`match_goals` heeft een rij per doelpunt van een gespeelde wedstrijd.
De rijen horen bij hun wedstrijd (`match_id`) en verdwijnen met haar.

| Kolom              | Betekenis                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `match_id`         | De wedstrijd                                                                                      |
| `ours`             | Of het doelpunt voor sc Heerenveen is (`true`) of voor de tegenstander (`false`)                  |
| `minute`           | De minuut op de klok: 45 bij "45+1"                                                               |
| `stoppage_minutes` | De minuten blessuretijd erbij: 1 bij "45+1"; leeg in de gewone speeltijd                          |
| `player`           | De naam zoals Wikipedia die toont, zoals `Van Bergen`                                             |
| `player_id`        | De speler van ons in `players` die het doelpunt maakte; leeg als er geen is (zie hieronder)       |
| `wikipedia_page`   | De pagina waar de naam naar linkt, zoals `Luca Oyen` voor `[[Luca Oyen\|Oyen]]`; leeg zonder link |
| `own_goal`         | Of het een eigen doelpunt is; het telt voor de club die ervan profiteert, dus `ours` is die club  |
| `penalty`          | Of het een penalty was                                                                            |

De goals van een club zijn even veel als haar `goals_for` of `goals_against`, maar de database dwingt dat niet af: de import controleert het en bewaart bij een verschil geen doelpuntenmakers (zie [de README van de importer](../../apps/importer/README.md)).
Een CHECK-constraint (`match_goals_not_own_goal_and_penalty`) houdt een doelpunt dat beide is buiten de deur.
`player_id` verwijst naar `players.id`, met `ON DELETE SET NULL`: wie een speler uit de tabel haalt, houdt zijn doelpunten, zonder koppeling.
Alleen een doelpunt van een speler van ons heeft een `player_id`: een doelpunt van sc Heerenveen dat geen eigen doelpunt is, en een eigen doelpunt dat bij de tegenstander staat.
Een doelpunt van een speler van de tegenstander, en een eigen doelpunt van een tegenstander, hebben er geen, en een doelpunt dat de importer niet kan koppelen ook niet.
De importer legt de koppeling (zie [de README van de importer](../../apps/importer/README.md)).
De volgorde van `id` is de volgorde van de klok, want de import schrijft de rijen zo; `listSeasonMatches` sorteert op minuut, blessuretijd en `id`.

`standings` heeft een rij per club van de Eredivisie.
De sleutel is het seizoen met de plaats.

| Kolom                                           | Betekenis                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| `position`, `club`                              | De plaats en de naam van de club                                                 |
| `played`, `won`, `drawn`, `lost`                | Gespeeld, gewonnen, gelijk en verloren                                           |
| `goals_for`, `goals_against`, `goal_difference` | Doelpunten voor en tegen, en het doelsaldo (kan negatief zijn)                   |
| `points`                                        | De punten                                                                        |
| `valid_on`                                      | De dag waarvoor de stand geldt: die van de laatste gespeelde competitiewedstrijd |

`wikipedia_pages` bewaart per gelezen pagina de `title`, de `kind` (`standings`, `programme` en `cup` voor de wedstrijden, `squad` voor de selectie), de `version` (de `Last-Modified` van Wikipedia, want de ruwe tekst heeft geen versienummer) en `read_at`, het tijdstip van de laatste keer dat de pagina goed gelezen is.
Een pagina kan daarmee de bron noemen.
`listWikipediaPages` geeft alleen de pagina's van de wedstrijden.

`match_imports` heeft per seizoen de gezondheid van de import: `last_success_at`, `last_outcome`, `failures_in_a_row`, `last_error`, `last_warning` en `retry_at`, de tijd waarvoor de import Wikipedia niet opnieuw vraagt.
Het zijn dezelfde velden als bij een feed.

`players` heeft een rij per speler van de selectie van sc Heerenveen 1 (mannen) en seizoen, van de Nederlandse Wikipedia.
De importer werkt de selectie van het lopende seizoen bij elke goede lezing bij en laat die van een eerder seizoen staan.
Hij vervangt haar niet, want de doelpunten in `match_goals` verwijzen naar de `id` van een speler: die blijft gelijk, ook als de speler de selectie verlaat.
Een naam komt in een seizoen één keer voor, en een pagina ook.

| Kolom            | Betekenis                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `season`         | Het seizoen, zoals `2026/27`                                                                                |
| `name`           | De naam zoals de tabel hem toont, zoals `Joost van Aken`                                                    |
| `position`       | `doelman`, `verdediger`, `middenvelder` of `aanvaller`                                                      |
| `shirt_number`   | Het rugnummer, 1 tot en met 99; leeg bij een speler zonder nummer                                           |
| `search_term`    | De naam zonder de eerste voornaam, zoals `van Aken`: waarop de zoekpagina zoekt                             |
| `wikipedia_page` | De pagina waar de tabel naar linkt, zoals `Luca Oyen` of `Pim Verbeek (voetballer, 1999)`; leeg zonder link |
| `in_squad`       | Of de speler nu in de selectie staat; een speler die de tabel verliet, blijft staan met `false`             |
| `left_squad_at`  | Het moment waarop hij de selectie verliet (UTC); leeg zolang hij erin staat                                 |

Er staat niets anders in: geen nationaliteit, leeftijd, contract of foto.
De cijfers van een speler staan in `player_season_stats` (zie hieronder).
De zoekterm is een eigen kolom, zodat je hem voor één speler kunt verbeteren: de importer zet hem alleen bij een nieuwe speler.

De lijst met spelers op `/nieuws/zoeken` komt uit `listSquad` in `queries.ts`, de ene plek die bepaalt wie erin staat.
Alleen de rijen van het lopende seizoen horen erin, en alleen de spelers die in de selectie staan (`in_squad`): een speler die vertrok, blijft in de tabel voor zijn doelpunten en staat niet in de lijst.
De zoekpagina met de lijst van spelers (#107) moet dus `listSquad` gebruiken en geen eigen vraag naar `players` doen.
De pagina van de selectie geeft `findSquadPage`, voor de bronvermelding onder de lijst.

`squad_imports` heeft per seizoen de gezondheid van de import van de selectie, met dezelfde velden als `match_imports`.

`player_season_stats` heeft per speler, seizoen en competitie de optredens, doelpunten en assists uit de tabel van de selectie op de Nederlandse Wikipedia (bron en licentie als bij de selectie: CC BY-SA 4.0).
De importer schrijft de rijen in dezelfde run als de selectie (zie de [README van de importer](../../apps/importer/README.md), _De cijfers van een speler_).

| Kolom         | Betekenis                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `player_id`   | De speler in `players`; een foreign key met `ON DELETE CASCADE`, dus de rij gaat met haar speler                |
| `season`      | Het seizoen, zoals `2026/27`                                                                                    |
| `competition` | `Eredivisie` of `KNVB Beker`; het totaal heeft geen rij, wie het toont telt de rijen op                         |
| `appearances` | Het aantal wedstrijden dat de speler erbij was, ook als invaller: het zijn geen minuten en geen basisplaatsen   |
| `goals`       | Het aantal doelpunten                                                                                           |
| `assists`     | Het aantal assists                                                                                              |
| `updated_at`  | Het moment waarop de cijfers voor het laatst veranderden (UTC); een run met dezelfde cijfers laat het ongemoeid |

Een speler, een seizoen en een competitie komen samen één keer voor.
Een competitie waarvoor de tabel geen cijfers geeft (een lege cel) heeft geen rij, en een streepje is nul.
Een speler die de selectie verlaat, houdt zijn laatste cijfers, want de importer haalt geen rij weg.
De tabel wordt met de hand bijgehouden en loopt soms een speelronde achter.
De importer vergelijkt de doelpunten met die in `match_goals` en waarschuwt bij een verschil, maar verbetert niets.
`listSeasonPlayerStats(db, season)` in `queries.ts` geeft de cijfers van een seizoen, per speler en competitie.
Bij elke rij staan de naam, de positie, de pagina op Wikipedia en of de speler in de selectie staat.
De rijen komen op naam en dan competitie.

De seed zet verzonnen wedstrijden, een verzonnen stand en de pagina's van Wikipedia waar ze naar verwijzen in het lopende seizoen (`madeUpMatches`, `madeUpTable` en `madeUpWikipediaPages` in `src/seed.ts`), maar alleen als dat seizoen er nog geen wedstrijden of stand heeft.
De pagina's staan erbij, zodat de site de bronvermelding laat zien zoals met echte gegevens.
Ook een verzonnen selectie met verzonnen namen komt erin (`madeUpSquad` en `seedSquad`), alleen als het lopende seizoen nog geen spelers heeft: met alle posities, een naam met een voorvoegsel, een naam van één woord en een speler zonder rugnummer.
De goede lezing van de selectie vervangt de verzonnen selectie bij de eerste keer dat hij slaagt, en de lezing van de wedstrijden vervangt de verzonnen wedstrijden.
Een database met echte wedstrijden raakt de seed niet aan.
De verzonnen doelpunten verwijzen naar verzonnen spelers (`madeUpGoals` en `madeUpSquad`), met een speler die de selectie verliet en twee spelers met dezelfde achternaam (Testvoort), zodat de pagina's en de controles de gevallen van de koppeling hebben.

## De tabellen `clubs` en `club_names`

De clubs waartegen sc Heerenveen speelde, zodat elke tegenstander een vaste naam en een vast adres heeft.
Een club is één artikel op de Nederlandse Wikipedia, ook als Wikipedia hem in de wedstrijden op twee manieren schrijft.
De gegevens komen van Wikipedia en vallen onder CC BY-SA 4.0, zoals de wedstrijden.

`clubs` heeft een rij per club.

| Kolom            | Betekenis                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `slug`           | De vaste naam in een adres: kleine letters, cijfers en enkele streepjes, hoogstens 80 tekens; uniek, en een nieuwe naam verandert hem niet |
| `name`           | De huidige naam: die van het nieuwste seizoen waarin we tegen de club speelden                                                             |
| `wikipedia_page` | De titel van het artikel, zoals `Telstar (voetbalclub)`; uniek als hij er is, en leeg voor een club waarvan we alleen een naam kennen      |
| `created_at`     | Wanneer de club is toegevoegd, in UTC                                                                                                      |

De CHECK-constraint `clubs_slug_format` weigert een slug met hoofdletters, een underscore of twee streepjes achter elkaar, in elke tool.
`wikipedia_page` vergelijkt letter voor letter (de collatie is `utf8mb4_bin`), want `Go Ahead Eagles` en `Go ahead eagles` zijn twee pagina's.
`club_names` heeft de andere namen van een club, zoals Wikipedia ze in wedstrijden schrijft (`N.E.C.` bij `NEC`).
Het zijn `club_id` en `name`; een naam is uniek, want hij hoort bij één club, en de rij gaat weg met haar club.
De huidige naam staat er niet nog eens in.

`matches.club_id` verwijst naar de club van de tegenstander.
Een club met wedstrijden is niet te verwijderen (de verwijzing heeft geen cascade), en een wedstrijd zonder club bestaat niet.
`matches.opponent` blijft de naam zoals Wikipedia hem in die wedstrijd schrijft.

De migratie `0021_add_clubs` maakt van de verschillende waarden van `matches.opponent` een club (hoofdletters tellen niet mee), met een slug van de naam, en koppelt elke wedstrijd.
De slug heeft geen accenten, punten of apostrofs (`N.E.C.` geeft `nec`) en krijgt `-2`, `-3` erachter als een andere club hem al heeft.
`kies` is voorbehouden, want de site gebruikt `kies` zelf in een adres, zoals `/statistieken/kies`; een club die zo heet, krijgt `kies-2`.
In een lege database doet de migratie niets.
Een club zonder artikel krijgt dat van de importer de eerstvolgende keer dat hij het seizoen leest.

De regels voor het vinden en maken van een club staan in `src/clubs.ts` (`@fansite/db/clubs`), en de importer gebruikt ze (zie de [README van de importer](../../apps/importer/README.md), _De clubs van de tegenstanders_).
`withClubs(db, rijen)` geeft wedstrijden zonder club hun club op naam, voor de seed en de tests.
De seed zet de verzonnen wedstrijden erin met verzonnen clubs.
Lezen de import de echte wedstrijden, dan verdwijnen de verzonnen wedstrijden maar blijven hun clubs staan; ze hebben geen wedstrijd meer, dus de queries tonen ze niet.

Vier queries in `queries.ts` zijn voor de pagina's van de tegenstanders:

- `listClubRecords(db, { competition })` geeft de clubs met minstens één wedstrijd, van A tot Z op naam, met het aantal gespeelde, gewonnen, gelijkgespeelde en verloren wedstrijden en de doelpunten voor en tegen.
  Een wedstrijd telt als gespeeld, gewonnen, gelijk of verloren op de doelpunten zoals Wikipedia ze geeft, dus een bekerwedstrijd die op strafschoppen is beslist, is gelijk.
  Zonder `competition` tellen alle wedstrijden, met `competition: 'Eredivisie'` alleen die van de competitie, en een club die we alleen in de beker troffen staat er dan niet in.
  Een club met alleen wedstrijden die nog niet zijn gespeeld, staat erin met nullen.
- `findClubBySlug(db, slug)` geeft één club met zijn `id`, `slug`, `name`, `wikipediaPage` en de andere namen (`otherNames`, van A tot Z), of niets voor een slug die niemand heeft.
- `listClubMatches(db, clubId, { competition })` geeft de wedstrijden tegen de club, de nieuwste eerst over alle seizoenen, ook de wedstrijden die nog niet gespeeld zijn.
  Bij elke wedstrijd staan het seizoen, de competitie, de ronde, de dag of de tekst voor de datum, de aftrap, thuis of uit, de uitslag en eventuele verlenging en strafschoppen.
  Met `competition` alleen die van de competitie.
- `listAllWikipediaPages(db)` geeft de pagina's van Wikipedia die de import voor de wedstrijden las, van alle seizoenen, het nieuwste seizoen eerst: het seizoen, de titel, het soort en het moment van lezen.
  Een pagina die over alle seizoenen telt, zoals de onderlinge resultaten, noemt ze allemaal als bron.

### Een club met twee namen samenvoegen

Staan dezelfde club en dezelfde artikelen twee keer in `clubs`, zoals `Excelsior` en `Excelsior Rotterdam` (de eerste zonder artikel, uit een wedstrijd waar de naam geen link had), dan voegt de projecteigenaar of een Builder ze met de hand samen.
Er is geen opdracht voor, want het komt zelden voor.
Doe het in één transactie, met `<blijft>` en `<gaat weg>` als het `id` van de twee clubs:

```sql
UPDATE matches SET club_id = <blijft> WHERE club_id = <gaat weg>;
UPDATE club_names SET club_id = <blijft> WHERE club_id = <gaat weg>;
INSERT INTO club_names (club_id, name) SELECT <blijft>, name FROM clubs WHERE id = <gaat weg>;
DELETE FROM clubs WHERE id = <gaat weg>;
```

De naam van de club die weggaat, staat daarna bij de andere namen van de club die blijft.
Schrijft Wikipedia die naam later weer, zonder link, dan vindt de importer de club die blijft.
Had de club die weggaat een eigen artikel, dan is het geen samenvoegen maar een vergissing: één artikel is één club, en de importer maakt de club bij de volgende lezing opnieuw.
De slug van de club die weggaat, werkt dan niet meer; de slug van de club die blijft verandert niet.

## De tabel `staff`

De staf van sc Heerenveen 1 (mannen), met een rol per rij.
Nu zijn dat de hoofdtrainers sinds 1 juli 1990, de eerste Eredivisie-wedstrijd van de club, met de rol `coach`.
De lijst met rollen (`staffRoles`) is een `enum` die kan groeien, bijvoorbeeld met `assistant-coach`.
Een rij is een periode van een persoon: een trainer met meer dan één periode, zoals Foppe de Haan, heeft meer dan één rij.

| Kolom                           | Betekenis                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `role`                          | De rol: nu alleen `coach`                                                                                 |
| `name`                          | De naam, hoogstens 100 tekens                                                                             |
| `wikipedia_page`                | De titel van de pagina op de Nederlandse Wikipedia, zoals `Johnny Jansen (1975)`; leeg als die er niet is |
| `start_date`, `start_precision` | De eerste dag van de periode, en hoe precies hij bekend is: `day`, `month` of `year`                      |
| `end_date`, `end_precision`     | De laatste dag van de periode, met dezelfde precisie; beide leeg bij iemand die nog in dienst is          |
| `interim`                       | Of de trainer tijdelijk invalde                                                                           |
| `note`                          | Een korte toelichting in onze woorden, bijvoorbeeld wat de bron openlaat, hoogstens 500 tekens            |

Een datum die Wikipedia alleen als maand of jaar geeft, is niet gegokt: hij staat als de eerste dag van die maand of dat jaar, met de precisie `month` of `year`.
Een CHECK-constraint weigert een maand die niet op de eerste dag staat en een jaar dat niet op 1 januari staat.
Andere constraints weigeren een einde voor het begin, een einddatum zonder precisie en een precisie zonder einddatum.
Een rol, naam en begindatum komen samen één keer voor.

De seed (`headCoaches` en `seedStaff` in `src/staff-seed.ts`) zet de rijen erin, van de Nederlandse Wikipedia, gelezen op 30 oktober 2026.
Elke omgeving krijgt ze: de site zet ze bij het opstarten op acceptatie en productie, en `pnpm db:seed` lokaal.
Een tweede keer maakt geen dubbele rijen: de seed vindt een rij op rol, naam en begindatum en werkt de rest bij.
Een rij met een andere begindatum is dus een nieuwe rij; een datum die je in een bestaande rij wilt corrigeren, vraagt een migratie.
Een nieuwe trainer komt als rij in `headCoaches`.
Waar Wikipedia een gat of een tegenspraak heeft, kiest de seed de voorzichtige waarde en schrijft de reden in `note`.

De vragen staan in `queries.ts`, met de rol als invoer, en rekenen met de dagen in `src/staff.ts`:

- `listStaffInSeason(db, role, season)` geeft de staf met die rol die in het seizoen zeker een dag in dienst was, op volgorde van begin.
  Een trainer die "in 2024" begon, staat dus niet in het seizoen ervoor, en iemand die "in juli 2014" stopte, niet in het seizoen dat op 1 juli 2014 begint.
- `findStaffOn(db, role, day)` geeft wie de rol heeft op een dag: `certain` met de persoon, `uncertain` met de personen die het kunnen zijn als de dag valt in de onzekerheid van een maand of jaar, en `none` voor een dag in een gat of vóór de eerste rij.
  Zo zegt een pagina niet stilzwijgend een naam bij een wedstrijd die in een grensmaand valt.
  Op de dag dat een nieuwe trainer begint, is hij de trainer; de laatste dag van de vorige is de dag ervoor.

De einddatum is de laatste dag.
Een einde in een maand of jaar telt als "in die maand gestopt", dus de laatste dag die zeker is, is de dag ervoor.

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

- `@fansite/db/schema`: de tabellen (`sources`, `feeds`, `items`, `articles`, `import_runs`, `import_results`, `robots_txt`, `audit_log`, `matches`, `match_goals`, `clubs`, `club_names`, `standings`, `wikipedia_pages`, `match_imports`, `players`, `player_season_stats`, `squad_imports`, die van het tellen van bezoeken en die van het beheer), hun types en de lengtes van `items`;
- `@fansite/db/visits`: `createVisitCounter(db)` geeft `record({ address, now, path, userAgent })`, dat een paginaweergave en, als de bezoeker vandaag nog niet is gezien, een bezoeker telt; `removeVisitorData(db, now)` gooit het zout en de kenmerken van eerdere dagen weg, `visitDay(moment)` geeft de dag in Nederland en `visitorHash(salt, address, userAgent)` het kenmerk;
- `@fansite/db/clubs`: `createClubBook(db)` geeft `resolve({ name, page, season })`, dat de club van een tegenstander vindt of maakt en de regels voor het logboek geeft; `withClubs(db, wedstrijden)` zet de club bij wedstrijden die er nog geen hebben; `clubSlug(naam)` en `normaliseClubName(naam)` rekenen de slug en de vergelijkingsvorm uit;
- `@fansite/db/season`: `seasonOf(moment)` geeft het seizoen waarin een moment valt, zoals `2026/27`, en `seasonStart(season)` de eerste dag;
- `@fansite/db/client`: `connect(url)` geeft een Drizzle-verbinding en een functie om hem te sluiten;
- `@fansite/db/queries`: `listEnabledSources(db)` geeft de bronnen die aanstaan, op naam, met hun beschrijving en zonder het beleid of de toestemming;
  `listRecentItems(db, { limit, until })` geeft de nieuwste `limit` berichten van die bronnen tot en met `until` (geef het moment van nu mee, want een tijd in de toekomst hoort er niet), het nieuwste eerst, met alleen de kop, de link, de tijd, de betaalmuur en de bronnaam (de `attribution`, of anders de naam), en geen afleveringen van bronnen van het soort podcast;
  `listPodcastEpisodes(db, { limit, offset, podcast, until })` geeft juist de afleveringen van de podcasts die aanstaan, het nieuwste eerst, met alleen de titel, de link, de tijd, de naam van de podcast en de duur, het seizoen en het nummer van de aflevering, en `countPodcastEpisodes` geeft het totaal; `podcast` is de `slug` van één podcast;
  `listArchivePage(db, { limit, offset, source, until })` geeft dezelfde berichten als `listRecentItems`, maar vanaf `offset` en zonder grens in leeftijd, voor het nieuwsarchief op `/nieuws`; `countArchiveItems` geeft het totaal, en `listArchiveSources` de bronnen met een `slug` en minstens één bericht voor het filter; `source` is de `slug` van één bron;
  `findPublishedArticle(db, slug, until)`, `findNewestArticle(db, until)` en `listPublishedArticles(db, until)` geven de gepubliceerde artikelen van de redactie (zie _De tabel `articles`_);
  `listSeasonPlayerStats(db, season)` geeft de optredens, doelpunten en assists van de spelers van een seizoen, een rij per speler en competitie (zie _De wedstrijden en de stand_);
  `listClubRecords(db, { competition })`, `findClubBySlug(db, slug)` en `listClubMatches(db, clubId, { competition })` geven de clubs met hun cijfers, één club en de wedstrijden tegen een club (zie _De tabellen `clubs` en `club_names`_);
  `listSeasonMatches(db, season)`, `listSeasonStandings(db, season)` en `listWikipediaPages(db, season)` geven de wedstrijden op volgorde van spelen, de stand van boven naar beneden en de pagina's van Wikipedia die de import las, voor één seizoen, met alleen de velden die een pagina toont;
  `listPodcasts(db)` geeft de podcasts met een `slug` en minstens één aflevering, voor het filter, en `findPodcast(db, slug)` geeft de naam, de beschrijving en de adressen bij Apple Podcasts en Spotify van één podcast;
- `@fansite/db/test-database`: `createTestDatabase()` maakt een eigen database met de migraties erop, voor tests in andere packages (zie _Tests_);
- `@fansite/db/env`: het Zod-schema voor `DATABASE_URL`, om in het schema van een app te zetten;
- `@fansite/db/lock`: `withLock(pool, name, waitSeconds, task)` doet een taak terwijl het een slot in de database houdt (`GET_LOCK`), en `lockNameFor(url, task)` geeft de naam daarvan, met de taak en de naam van de database erin.
  De migraties en de import gebruiken het, elk met een eigen naam;
- `@fansite/db/prepare`: `prepareDatabase({ migrationsFolder, seed, url })` draait de migraties die de database nog niet had en zet op verzoek de echte bronnen en de verzonnen wedstrijden uit de seed erin: `seed` is de omgeving (`acceptance`, `production` of `local`), want alleen `acceptance` krijgt ook de verzonnen wedstrijden en haalt de testbronnen weg, en `local` krijgt niets.
  Een slot in de database (`fansite_migrate_<database>`) laat twee processen die tegelijk starten, om de beurt werken.
  De site roept het aan als hij start.
  De functie gooit bij een fout en laat het aan de aanroeper wat dat betekent; de aanroeper geeft zelf de map met de migraties, want een gebundelde build weet niet waar die staat.
