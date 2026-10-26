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

| Opdracht           | Wat het doet                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `pnpm db:generate` | Maakt een migratie uit `src/schema.ts` met drizzle-kit, in `drizzle/`                                        |
| `pnpm db:migrate`  | Voert de migraties uit die de database uit `DATABASE_URL` nog niet had                                       |
| `pnpm db:seed`     | Zet de testbronnen en de echte bronnen met hun feeds in het register; een tweede keer maakt het geen dubbele |
| `pnpm test`        | Draait de tests, ook die op een echte MariaDB (zie _Tests_)                                                  |

`db:migrate` gebruikt de migrator van `drizzle-orm` en niet drizzle-kit.
Daardoor kan dezelfde code op de hosting draaien, zonder ontwikkelgereedschap: de site doet dat als hij start (zie _In andere packages_).

De seed heeft twee lijsten in `src/seed.ts`:

- `testSources` zijn de verzonnen bronnen met verschillende beleiden en toestemmingen, voor lokaal gebruik en de tests.
  Ze staan alleen lokaal in het register, en niet op acceptatie of productie.
- `realSources` zijn de echte bronnen met hun feeds, zoals de nieuwsbronnen (de lijst staat in [`docs/bronnen.md`](../../docs/bronnen.md)), de podcasts en ons eigen forum, sc Heerenveen Forum.
  Ze staan op elke omgeving in het register.

`db:seed` zet allebei erin en weigert als `SITE_ENV` `production` is: wat de site bij het opstarten doet, is daar de enige weg.
Met `SITE_ENV=acceptance` of `production` zet de site alleen `realSources` in het register (`seedRealSources`).
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
| `opponent`, `home`, `stadium`        | De tegenstander, of de wedstrijd thuis is, en het stadion (kan ontbreken)                                    |
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

| Kolom              | Betekenis                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `match_id`         | De wedstrijd                                                                                     |
| `ours`             | Of het doelpunt voor sc Heerenveen is (`true`) of voor de tegenstander (`false`)                 |
| `minute`           | De minuut op de klok: 45 bij "45+1"                                                              |
| `stoppage_minutes` | De minuten blessuretijd erbij: 1 bij "45+1"; leeg in de gewone speeltijd                         |
| `player`           | De naam zoals Wikipedia die toont, zoals `Van Bergen`                                            |
| `own_goal`         | Of het een eigen doelpunt is; het telt voor de club die ervan profiteert, dus `ours` is die club |
| `penalty`          | Of het een penalty was                                                                           |

De goals van een club zijn even veel als haar `goals_for` of `goals_against`, maar de database dwingt dat niet af: de import controleert het en bewaart bij een verschil geen doelpuntenmakers (zie [de README van de importer](../../apps/importer/README.md)).
Een CHECK-constraint (`match_goals_not_own_goal_and_penalty`) houdt een doelpunt dat beide is buiten de deur.
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

`wikipedia_pages` bewaart per gelezen pagina de `title`, de `version` (de `Last-Modified` van Wikipedia, want de ruwe tekst heeft geen versienummer) en `read_at`, het tijdstip van de laatste keer dat de pagina goed gelezen is.
Een pagina kan daarmee de bron noemen.

`match_imports` heeft per seizoen de gezondheid van de import: `last_success_at`, `last_outcome`, `failures_in_a_row`, `last_error`, `last_warning` en `retry_at`, de tijd waarvoor de import Wikipedia niet opnieuw vraagt.
Het zijn dezelfde velden als bij een feed.

De seed zet verzonnen wedstrijden, een verzonnen stand en de pagina's van Wikipedia waar ze naar verwijzen in het lopende seizoen (`madeUpMatches`, `madeUpTable` en `madeUpWikipediaPages` in `src/seed.ts`), maar alleen als dat seizoen er nog geen wedstrijden of stand heeft.
De pagina's staan erbij, zodat de site de bronvermelding laat zien zoals met echte gegevens.
De eerste echte import vervangt ze, en een database met echte wedstrijden raakt de seed niet aan.

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

- `@fansite/db/schema`: de tabellen (`sources`, `feeds`, `items`, `articles`, `import_runs`, `import_results`, `robots_txt`, `audit_log`, `matches`, `match_goals`, `standings`, `wikipedia_pages`, `match_imports`, die van het tellen van bezoeken en die van het beheer), hun types en de lengtes van `items`;
- `@fansite/db/visits`: `createVisitCounter(db)` geeft `record({ address, now, path, userAgent })`, dat een paginaweergave en, als de bezoeker vandaag nog niet is gezien, een bezoeker telt; `removeVisitorData(db, now)` gooit het zout en de kenmerken van eerdere dagen weg, `visitDay(moment)` geeft de dag in Nederland en `visitorHash(salt, address, userAgent)` het kenmerk;
- `@fansite/db/season`: `seasonOf(moment)` geeft het seizoen waarin een moment valt, zoals `2026/27`, en `seasonStart(season)` de eerste dag;
- `@fansite/db/client`: `connect(url)` geeft een Drizzle-verbinding en een functie om hem te sluiten;
- `@fansite/db/queries`: `listEnabledSources(db)` geeft de bronnen die aanstaan, op naam, met hun beschrijving en zonder het beleid of de toestemming;
  `listRecentItems(db, { limit, until })` geeft de nieuwste `limit` berichten van die bronnen tot en met `until` (geef het moment van nu mee, want een tijd in de toekomst hoort er niet), het nieuwste eerst, met alleen de kop, de link, de tijd, de betaalmuur en de bronnaam (de `attribution`, of anders de naam), en geen afleveringen van bronnen van het soort podcast;
  `listPodcastEpisodes(db, { limit, offset, podcast, until })` geeft juist de afleveringen van de podcasts die aanstaan, het nieuwste eerst, met alleen de titel, de link, de tijd, de naam van de podcast en de duur, het seizoen en het nummer van de aflevering, en `countPodcastEpisodes` geeft het totaal; `podcast` is de `slug` van één podcast;
  `findPublishedArticle(db, slug, until)`, `findNewestArticle(db, until)` en `listPublishedArticles(db, until)` geven de gepubliceerde artikelen van de redactie (zie _De tabel `articles`_);
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
