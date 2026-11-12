# Back-ups

De database heeft een back-up die we echt kunnen terugzetten.
Elke nacht maakt cron op de host een dump van de database, een bestand met alle tabellen en de rijen van alle tabellen op vijf na.
Dit bestand zegt wat dat doet, hoe de eigenaar het instelt, hoe je een dump terugzet en wat de dumps aan opslag kosten.
Het zegt ook hoe de projecteigenaar een kopie van de database van acceptatie op zijn eigen computer zet, zonder persoonsgegevens.

Een dump beschermt tegen een fout in een migratie of een verkeerde actie.
Hij beschermt niet tegen het verlies van de host zelf: de dumps staan op dezelfde host als de database.
Een kopie buiten de host en een back-up van bestanden doen we niet.
De site is te herbouwen uit GitHub, en de koppen haalt de importer opnieuw op.
Wat we niet opnieuw kunnen maken, is het register van de bronnen en later de verborgen berichten en de accounts.
Dat is klein genoeg voor een dump (zie _Wat de dumps kosten_).

## Zo werkt het

Eén bestand doet het werk: `packages/db/backup.mjs` in de map van de app.
`assemble` maakt het, en elke deploy zet het op de host, naast de migraties.
Het bestand heeft drie opdrachten en geen `node_modules` nodig: `backup`, `restore` en `export`.
De derde schrijft een dump zonder persoonsgegevens naar de standaarduitvoer en maakt geen bestand (zie _Een kopie van acceptatie op je eigen computer_).
Het leest zijn instellingen uit de omgeving, op de host uit hetzelfde bestand als de importer.

| Instelling          | Wat erin staat                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | De database waarvan de opdracht een dump maakt, of waarin hij er een terugzet             |
| `BACKUP_FOLDER`     | De map voor de dumps: een volledig pad, buiten `public_html`                              |
| `BACKUP_KEEP_DAYS`  | Hoeveel dagen dumps blijven staan, van 1 tot en met 365; zonder waarde 14                 |
| `MYSQLDUMP_COMMAND` | Het pad van `mysqldump`, als cron het niet vindt; zonder waarde `mysqldump`               |
| `MYSQL_COMMAND`     | Het pad van `mysql`, voor het terugzetten, als cron het niet vindt; zonder waarde `mysql` |

De opdracht `backup`:

1. Maakt de map met rechten voor alleen het account (`drwx------`) als ze er nog niet is.
   Staat er al een map die andere accounts kunnen lezen, dan stopt hij en zegt welke `chmod` je moet draaien.
   Hij verandert de rechten van een bestaande map niet zelf: dat kan de thuismap zijn.
   Ligt de map in `public_html`, dan weigert hij ook.
2. Draait `mysqldump` met `--single-transaction`, zodat de site tijdens de dump gewoon werkt en er niets vergrendeld wordt.
   Hij draait het twee keer, achter elkaar in hetzelfde bestand: eerst alle tabellen met hun rijen, behalve de vijf hieronder, en dan alleen de structuur van die vijf.
   - `visitor_salts` en `visitor_hashes`: het zout en de kenmerken van de bezoekers van de dag gooit de site aan het eind van de dag weg (zie _We tellen paginaweergaven en unieke bezoekers per dag_ in `beslissingen/redactie.md`).
     Met het zout reken je de kenmerken terug naar adressen.
   - `discussions`: de schermnaam van de laatste reageerder vervangt de importer bij elke run (zie het hoofdstuk Redactie in Storybook).
   - `admin_sessions` en `admin_login_links`: een teruggezette sessie of inloglink zou een toegang herstellen die na de dump is ingetrokken.

   Ze zouden anders 14 dagen in de dumps blijven staan.
   Een teruggezette database krijgt de vijf tabellen wel, maar leeg.
   De importer vult de discussies binnen een kwartier opnieuw, en een sessie maak je door opnieuw in te loggen.

3. Comprimeert de uitvoer met gzip en schrijft hem naar `<database>-<datum>T<tijd>Z.sql.gz`, in UTC, zoals `fansite_acc-2026-10-26T031507Z.sql.gz`.
   Het bestand heeft rechten voor alleen het account (`-rw-------`).
   Hij schrijft eerst naar een bestand dat op `.partial` eindigt, en noemt het pas om als de dump klaar is.
4. Controleert dat de dump klaar is: `mysqldump` sluit een volledige dump af met de regel `-- Dump completed`.
5. Verwijdert daarna de dumps van dezelfde database die ouder zijn dan 14 dagen.
   De nieuwste dump blijft altijd staan, ook als hij oud is: als cron stopte, is dat de enige die er is.
   Andere bestanden en de dumps van een andere database laat hij met rust.

Mislukt de dump, dan schrijft de opdracht op stderr wat er misging, laat hij geen bestand achter, verwijdert hij niets en stopt hij met code 1.
Een fout in de opdracht zelf geeft code 2.
Het wachtwoord staat nooit in de opdrachtregel en niet in de uitvoer.
`mysqldump` krijgt het in een optiebestand met rechten voor alleen het account (`--defaults-extra-file`), dat de opdracht in een eigen tijdelijke map maakt en na afloop weghaalt.
Zo kan geen ander account op de host het wachtwoord zien met `ps`.

## Eenmalig instellen

De eigenaar doet dit zelf, met SSH en in DirectAdmin.
Een agent heeft daar geen toegang.
De stappen gaan uit van acceptatie, met de paden uit [`acceptatieomgeving.md`](acceptatieomgeving.md).
Productie (#33) krijgt zijn eigen bestand met instellingen en zijn eigen map.

1. **De programma's.**
   De opdracht heeft `mysqldump` nodig, en `mysql` voor het terugzetten.
   Controleer met SSH dat ze er zijn:

   ```sh
   command -v mysqldump mysql
   mysqldump --version
   ```

   Staan ze niet op het pad van cron (`/usr/bin:/bin`), zet dan hun volledige pad in het bestand van stap 2, bij `MYSQLDUMP_COMMAND` en `MYSQL_COMMAND`.
   Meldt de eerste dump dat `COLUMN_STATISTICS` ontbreekt, dan is dit de `mysqldump` van MySQL 8 en niet die van MariaDB.
   Zoek dan met `ls /usr/bin/*dump*` of de host `mariadb-dump` heeft, en zet dat pad bij `MYSQLDUMP_COMMAND`.

2. **De instellingen.**
   Open het bestand voor de import, `~/fansite-acceptatie.env`, met een editor, en zet er twee regels bij:

   ```sh
   BACKUP_FOLDER=/home/<gebruiker>/fansite-back-ups
   BACKUP_KEEP_DAYS=14
   ```

   Zonder `BACKUP_KEEP_DAYS` bewaart de opdracht ook 14 dagen.
   Gebruik geen `~` in het pad: de opdracht werkt het niet uit.
   De importer leest dit bestand ook, en negeert wat hij niet kent.

3. **Een eerste dump met de hand.**
   Draai de opdracht van de cronjob (stap 4), zonder het deel vanaf `>>`, en kijk wat er gebeurt:

   ```sh
   /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-acceptatie.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/packages/db/backup.mjs backup
   ls -l /home/<gebruiker>/fansite-back-ups
   ```

   Hij zegt `Dumped <database> to <bestand> (<grootte>). Removed 0 dumps older than 14 days.` en stopt met code 0.
   De map begint met `drwx------` en het bestand met `-rw-------`.

4. **De cronjob.**
   Open in DirectAdmin _Advanced Features → Cron Jobs_ en maak een cronjob, net als bij de import:
   - Minuut: `17`.
   - Uur: `3`.
   - Dag van de maand, maand en dag van de week: `*`.
   - Opdracht, op één regel:

     ```sh
     (date; /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-acceptatie.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/packages/db/backup.mjs backup) >> /home/<gebruiker>/fansite-back-up.log 2>&1
     ```

   Vervang `<gebruiker>` door je gebruikersnaam, en gebruik `DEPLOY_PATH` als de map van de app anders heet.
   Het pad van Node staat in stap 9 van _Eenmalig instellen_ in `acceptatieomgeving.md`.
   De opdracht draait om 03:17, niet op het hele uur: dan starten veel andere cronjobs.
   Laat het e-mailadres voor de uitvoer van cron leeg.
   De uitvoer komt achteraan in `~/fansite-back-up.log`, met de tijd van de run ervoor.
   Niets ruimt dat bestand op; het groeit met twee regels per nacht.
   Faalt de back-up drie nachten achter elkaar, dan mailt hij de projecteigenaar.
   Daarvoor moeten `ALERT_MAIL_TO` en de instellingen van de mailbox in het bestand van stap 2 staan (zie _Een mail als een import blijft falen_ in `acceptatieomgeving.md`).
   Slaagt hij weer, dan volgt één mail dat het weer werkt.

## Controleren

- `tail -n 4 ~/fansite-back-up.log` toont de tijd van de laatste run en een regel `Dumped …`.
  Staat daar `The backup failed: …`, dan zegt de regel waarom.
- `ls -l ~/fansite-back-ups` toont voor elke nacht één bestand, de laatste 14 dagen, elk met `-rw-------`.
- `gunzip -c <bestand> | tail -n 3` toont `-- Dump completed on …` als laatste regel.
- `du -sh ~/fansite-back-ups` toont wat de dumps bij elkaar kosten (zie _Wat de dumps kosten_).

Niemand ziet het vanzelf als de dumps ophouden.
Kijk daarom af en toe in de map, bijvoorbeeld bij het begin van een nieuwe versie.

## Een dump op aanvraag

De opdracht is dezelfde als die van cron.
Log in met SSH en draai hem, zonder het deel vanaf `>>`:

```sh
/opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-acceptatie.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/packages/db/backup.mjs backup
```

Hij stopt met code 0 als de dump er is, met 1 als hij mislukte, en met 2 als de opdracht niet klopt.
Een workflow kan hem dus over SSH aanroepen en niet kopiëren als hij niet met 0 stopt.
Dat voegt het vervolgissue (#347) toe aan `acceptance.yml` en `production.yml`.
Een dump op aanvraag past in dezelfde map en telt mee voor het opruimen: na 14 dagen gaat hij weg, net als de nachtelijke.
Twee dumps in dezelfde seconde krijgen dezelfde naam; de tweede weigert dan, en je probeert het een moment later opnieuw.

De vier workflows die met de hand een import starten (_Import season_, _Import seasons_, _Import squads_ en _Import old site_ met de actie `import`) maken zo eerst een dump, met dezelfde Node en hetzelfde bestand met variabelen als de import.
Faalt de dump, dan importeert de workflow niets.
De samenvatting van de run noemt het bestand.
De acties `report` en `status` maken geen dump.
De dump telt mee voor het opruimen: hij blijft `BACKUP_KEEP_DAYS` dagen staan, zonder waarde 14, en het gaat om dagen en niet om een aantal bestanden.

Op je eigen computer doe je hetzelfde met `pnpm db:backup`.
Dat leest `DATABASE_URL` en `BACKUP_FOLDER` uit de `.env` in de root, en vraagt `mysqldump` of `mariadb-dump` op je eigen computer (zie `.env.example`).

## Terugzetten

Een dump gaat altijd in een lege database.
De opdracht `restore` weigert een database met tabellen, voordat hij iets schrijft.
Zo komt er nooit een dump bovenop gegevens die er al staan.

Zet een dump terug in dezelfde database, dus nadat een migratie of een actie de gegevens verknalde:

1. **Kies de dump.**
   `ls -l ~/fansite-back-ups` toont ze.
   Kies de laatste dump van vóór de fout.
   Alles wat daarna is gebeurd, zoals artikelen en verborgen berichten, is verloren.
   De koppen haalt de importer opnieuw op.
2. **Maak een lege database.**
   Maak in DirectAdmin onder _MySQL Management_ een nieuwe database met een eigen gebruiker, zoals bij _Eenmalig instellen_, stap 3, in `acceptatieomgeving.md`.
   Houd de kapotte database bij de hand tot de site weer werkt: dan heb je nog iets om in te kijken.
3. **Wijs een bestand met instellingen naar de lege database.**
   Kopieer `~/fansite-acceptatie.env` naar `~/fansite-terugzetten.env` en zet `DATABASE_URL` op de nieuwe, lege database.
   Zet er rechten van alleen het account op (`chmod 600`) en open het met een editor, niet met `echo`.
4. **Zet de dump terug.**

   ```sh
   /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-terugzetten.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/packages/db/backup.mjs restore /home/<gebruiker>/fansite-back-ups/<bestand>.sql.gz
   ```

   Hij zegt `Restored <aantal> tables from <bestand> into <database>.` en stopt met code 0.
   Mislukt het, dan staat de fout op stderr en stopt hij met 1; de dump zelf blijft ongemoeid.
   Een mislukte poging laat een halve database achter: haal hem weg en maak een nieuwe.

5. **Wijs de site naar de nieuwe database.**
   Zet `DATABASE_URL` van de Node.js-app in DirectAdmin (_Setup Node.js App_) en in `~/fansite-acceptatie.env` op de nieuwe database, en start de app opnieuw.
   Een dump van vóór een migratie krijgt die migratie bij de start: de site draait de migraties die de database nog niet had (zie _Het schema en de bronnen_ in `acceptatieomgeving.md`).
6. **Controleer de site.**
   Open `/bronnen` en de homepage, en kijk of de nieuwste artikelen in `/beheer/artikelen` er zijn.
   Draai daarna `rm ~/fansite-terugzetten.env`, want het bevat een wachtwoord.

Op je eigen computer zet je een dump terug met `pnpm db:restore <bestand>`, in een lege database: maak er een met `docker compose exec mariadb mariadb -e 'CREATE DATABASE terugzetten'` en zet `DATABASE_URL` daarop.

## Een kopie van acceptatie op je eigen computer

Met één opdracht zet de projecteigenaar een kopie van de database van acceptatie in de lokale database `fansite_acc`.
Een query op die kopie beantwoordt dan een vraag over de gegevens, zonder dat iemand pagina's leest.
De kopie heeft geen persoonsgegevens en zegt zelf hoe oud ze is.

```sh
pnpm db:pull-acceptance
```

De opdracht start over SSH `backup.mjs export` op de host en geeft wat die schrijft direct aan de lokale database.
De dump wordt nergens een bestand, niet op de host en niet op je computer.
Alleen de projecteigenaar draait de opdracht: hij gebruikt de SSH-sleutel van de host, en agents hebben geen toegang tot de host.
Agents bevragen de kopie alleen (zie _The copy of the acceptance database_ in `AGENTS.md`).

### Wat er in de kopie staat

`packages/db/src/export-plan.ts` zegt van elke tabel van het schema wat de export ermee doet.

| Tabellen                                                                                                          | Wat de kopie krijgt                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visitor_salts`, `visitor_hashes`, `discussions`, `admin_sessions`, `admin_login_links` en `admin_login_attempts` | Alleen de structuur, zonder rijen                                                                                                                         |
| `admin_users`                                                                                                     | Elk account met het adres `beheerder-<id>@example.invalid` en de voornaam `Account <id>`, en het echte nummer, de rol, de keuze voor de mail en de tijden |
| Alle andere tabellen, en `__drizzle_migrations`                                                                   | Alle rijen                                                                                                                                                |
| `acceptance_copy`, een tabel die alleen in de kopie bestaat                                                       | Eén rij met `dumped_at`, de tijd van de dump op de host, en `loaded_at`, de tijd van het laden, in UTC                                                    |

De export leest het echte adres en de echte voornaam van een account niet: de query vraagt de database om de verzonnen waarden.
Wie wat deed, staat in `audit_log`, `articles`, `article_versions`, `match_edits` en `match_reports` als het nummer van een account, en dat nummer blijft kloppen.
De export vraagt `mysqldump` om elke tabel bij naam.
Heeft de database een tabel die niet in de lijst staat, of heeft `admin_users` een kolom die de lijst niet kent, dan stopt de export voordat hij iets schrijft.
Een test vergelijkt de lijst met `packages/db/src/schema.ts`, zodat een nieuwe tabel al in CI opvalt.
Het wachtwoord van de database staat ook hier in een optiebestand dat de opdracht na afloop weghaalt, en niet in de opdrachtregel of de uitvoer.

Na het laden zet de opdracht één account in de kopie om lokaal mee in te loggen: `beheer@example.test`, met de rol `owner` en de voornaam Lokaal.

### Eenmalig instellen

1. Zet deze instellingen in de `.env` in de root van de repository.
   Git negeert dat bestand.
   De waarden zijn die van de geheimen van de omgeving `acceptatie` (zie _Eenmalig instellen_, stap 6, in `acceptatieomgeving.md`); ze horen nergens in de repository, in een issue of in een pull request.

   | Instelling            | Wat erin staat                                                                                 |
   | --------------------- | ---------------------------------------------------------------------------------------------- |
   | `ACCEPTANCE_SSH_HOST` | De hostnaam van de SSH-server, zoals in `SSH_HOST`                                             |
   | `ACCEPTANCE_SSH_USER` | De gebruikersnaam voor SSH, zoals in `SSH_USER`                                                |
   | `ACCEPTANCE_SSH_KEY`  | Het volledige pad van de privésleutel uit stap 4, zonder `~`                                   |
   | `ACCEPTANCE_APP_PATH` | Het volledige pad van de map van de app op de host, zoals in `DEPLOY_PATH`                     |
   | `ACCEPTANCE_SSH_PORT` | De poort van SSH; zonder waarde 26                                                             |
   | `MYSQL_COMMAND`       | Het pad van een eigen `mysql` of `mariadb`; zonder waarde de client in de container van Docker |

2. Start de lokale database: `docker compose up -d --wait`.
   `DATABASE_URL` in `.env` moet naar die database op je eigen computer wijzen; de opdracht weigert een andere host dan `127.0.0.1` of `localhost`.
3. Log één keer met de hand in op de host, als je dat op deze computer nog niet deed: `ssh -p 26 -i <sleutel> <gebruiker>@<host>`.
   Zo kent je computer de sleutel van de host.
   De opdracht stelt zelf geen vragen en vraagt geen wachtwoord: lukt het inloggen niet zonder, dan stopt hij.
4. De host moet een deploy hebben gehad met de opdracht `export` erin.

### Wat je ziet

De opdracht zegt aan het eind hoe oud de kopie is:

```text
Copied the acceptance database into fansite_acc (55 tables).
The dump was made on the host at 2026-11-10 16:39:14 UTC and loaded here at 2026-11-10 16:39:21 UTC.
Log in on the copy as beheer@example.test.
```

Het aantal tabellen groeit mee met het schema.
De opdracht maakt `fansite_acc` elke keer opnieuw, en raakt geen andere database aan: niet `fansite` en niet de database van een werkmap.
De oude kopie blijft staan tot de host begint te sturen, dus een verkeerde sleutel kost je niets.
Mislukt het halen of het laden daarna, dan haalt de opdracht de halve kopie weg, zegt hij op stderr waarom en stopt hij met code 1.

### De kopie bevragen

```sh
docker compose exec -T mariadb mariadb fansite_acc -e 'SELECT dumped_at, loaded_at FROM acceptance_copy'
```

Zo lees je eerst hoe oud de kopie is, en daarna stel je je vraag op dezelfde manier.
Geen werkmap krijgt de naam `fansite_acc`: `scripts/worktree-env.js` weigert een map die `acc` heet, en `pnpm worktree:db:drop` laat de kopie staan.

### De site op de kopie

```sh
DATABASE_URL=mysql://root@127.0.0.1:3306/fansite_acc pnpm dev
```

Met een `DATABASE_URL` die je zelf zet, maakt `pnpm dev` geen database en zet het de seed er niet in.
Dat doet het alleen voor de database van een werkmap.
De site draait bij de start wel de migraties die de kopie nog niet had.
Loopt je code voor op acceptatie, dan heeft de kopie daarna een nieuwer schema dan acceptatie; haal een nieuwe kopie als je weer het schema van acceptatie wilt.
Draai `pnpm db:seed` niet op de kopie: dat zet de testbronnen erbij.

Inloggen gaat op `/beheer/inloggen` met `beheer@example.test`.
Lokaal verstuurt de site geen mail: de link en de code staan in de uitvoer van `pnpm dev`.

### De proef

**10 november 2026, lokaal, met verzonnen gegevens: gelukt.**
De bron was een database met de 68 migraties, de seed, twee accounts met een verzonnen adres op `example.org`, een sessie, een inlogpoging en een zout.
`backup.mjs export` draaide met `mariadb-dump` 10.11 uit de container van `docker compose`, en `pnpm db:pull-acceptance` laadde de uitvoer met `mariadb` uit dezelfde container.
In plaats van `ssh` stond er een klein script dat de export lokaal start.
De dump had 2080 regels, zonder een adres op `example.org` en zonder de sessie, de inlogpoging of het zout.
De kopie had 55 tabellen, de 14 wedstrijden van de seed, alle 68 rijen van `__drizzle_migrations`, de twee accounts als `beheerder-1@example.invalid` en `beheerder-2@example.invalid`, het account `beheer@example.test` en de twee tijden.

**Wat de proef niet bewijst:** dat het over SSH naar de echte host werkt, met de `mysqldump` van de host.
Dat laat de eerste keer zien dat de projecteigenaar de opdracht draait.

## Wat de dumps kosten

De gedeelde hosting heeft 10 GB opslag, samen met het forum.
Op 26 oktober 2026 woog een dump van de database met de echte bronnen en wat verzonnen artikelen en koppen 11 kB.

De database groeit vooral door de koppen (`items`) en het logboek van de import (`import_results`, 30 dagen).
Voor een schatting vulden we een kopie met 100.000 koppen en 43.200 regels van het logboek.
Dat is ruim honderd keer zoveel koppen als in de proef hieronder.
De koppen hadden lange, willekeurige adressen, die zich slecht laten comprimeren, dus het getal is aan de hoge kant:

| Wat                             | Grootte |
| ------------------------------- | ------- |
| De dump, ongecomprimeerd        | 40 MB   |
| De dump, gecomprimeerd met gzip | 4,1 MB  |
| 14 dagen dumps                  | 58 MB   |
| Dat deel van de 10 GB           | 0,6%    |

De dumps kosten dus weinig, ook als de database tien keer zo groot wordt.
De 14 dagen blijven staan.
Is het ooit te veel, bijvoorbeeld omdat `du -sh ~/fansite-back-ups` een paar honderd MB toont of de hosting vol raakt, zet dan `BACKUP_KEEP_DAYS` lager in `~/fansite-acceptatie.env`.
De volgende dump ruimt de rest op.
Komen er accounts en berichten bij die de database veel groter maken, bekijk de keuze dan opnieuw.

## De proef van het terugzetten

We hebben het terugzetten één keer echt gedaan, voordat we op de dumps vertrouwden.

**26 oktober 2026, lokaal, op MariaDB 10.11 (de versie van de host): gelukt.**

1. Een database gevuld zoals de host haar vult: de site draaide de 18 migraties en zette de echte bronnen uit de seed in het register.
   Daarna kwamen de testbronnen, verzonnen koppen, discussies, afleveringen, drie artikelen en een account van de redactie erbij (`pnpm db:seed` en `pnpm --filter site test-data`).
   Het waren 26 tabellen, met 19 bronnen, 15 feeds, 55 koppen en 3 artikelen.
2. `backup.mjs backup`, zoals de cronjob hem draait, maakte een dump van 11 kB, met rechten `-rw-------` in een map met `drwx------`.
3. `backup.mjs restore` zette de dump terug in een lege database en meldde 26 tabellen.
   Een tweede restore in dezelfde database weigerde en stopte met code 1.
4. `CHECKSUM TABLE` gaf voor alle tabellen met rijen dezelfde uitkomst in beide databases, behalve de vijf die de dump leeg laat (zie hieronder), en beide hebben 15 foreign keys.
   Ook `__drizzle_migrations` kwam mee, dus de site draait geen migratie opnieuw.
   In de bron stond een zout en een kenmerk van een bezoeker; in de dump en in de teruggezette database waren de twee tabellen leeg.
5. De gebouwde site (`assemble`, zoals op de host) draaide op beide databases.
   De homepage en `/bronnen` gaven 200 en precies dezelfde HTML.
   Met `SITE_ENV=acceptance` op de teruggezette database startte de site, meldde dat de database klaar was met de echte bronnen, en toonde `/bronnen` met de Leeuwarder Courant en zonder testbronnen.
6. Voor de schatting hierboven vulden we een derde kopie met 100.000 koppen en 43.200 regels logboek: de dump kostte 4,1 MB en het terugzetten ging ook goed.

**27 oktober 2026, na de review, opnieuw met de echte clients:** de bron had ook een discussie met een schermnaam.
De dump had geen enkele rij van `discussions`, `admin_sessions`, `admin_login_links`, `visitor_salts` en `visitor_hashes`, maar wel hun `CREATE TABLE`.
De terugzetting meldde 26 tabellen, en `sources`, `feeds` en `__drizzle_migrations` kregen dezelfde `CHECKSUM TABLE` als de bron.

De computer van de proef had geen `mysqldump`.
De proef gebruikte `mariadb-dump` en `mariadb` 10.11.19 uit de container van `docker compose`, via twee kleine scripts die het optiebestand de container in kopiëren en dan de client daar draaien.
De opdrachten, de rechten, het optiebestand, de compressie en het opruimen zijn dezelfde als op de host.

**Wat de proef niet bewijst:** dat `mysqldump` en `mysql` op de host staan en met onze instellingen werken, en dat de gebruiker van de database er mag dumpen (`SELECT`, en `LOCK TABLES` is niet nodig).
Dat laat de eenmalige eerste dump met de hand zien (_Eenmalig instellen_, stap 3).
De proef op de host van acceptatie volgt in het vervolgissue (#347).

## Als het niet werkt

- `mysqldump is not installed here, or not on the path`: stap 1 van _Eenmalig instellen_.
- `mysqldump stopped with code 2. It said: … Access denied`: de gebruiker in `DATABASE_URL` mag de database niet lezen, of het wachtwoord klopt niet.
  Controleer het met de import: die gebruikt dezelfde gegevens.
- `BACKUP_FOLDER: must be an absolute path`: het pad begint niet met een `/`.
- `… can be read by other accounts`: draai de `chmod 700` die de melding noemt.
- `… is in public_html`: kies een map buiten `public_html`, bijvoorbeeld in de thuismap.
- `ended without the line that closes a dump`: de dump is afgebroken, bijvoorbeeld omdat de schijf vol raakte.
  Er is geen bestand achtergebleven.
  Kijk met `df -h ~` hoeveel ruimte er is.
- De map groeit niet: kijk in `~/fansite-back-up.log`, en daarna in DirectAdmin of de cronjob bestaat.

Bij `pnpm db:pull-acceptance`:

- `Environment variables are missing or invalid`: de melding noemt de instelling; zie _Eenmalig instellen_ bij de kopie.
- `ssh stopped with code 255. It said: … Permission denied (publickey)`: `ACCEPTANCE_SSH_KEY` wijst niet naar de sleutel van de host, of de gebruiker klopt niet.
- `… Host key verification failed`: log één keer met de hand in, zodat je computer de host kent.
- `ssh stopped with code 2`, met de regels `Usage:` van `backup.mjs`: de host heeft nog een versie zonder `export`.
  Wacht op de volgende deploy.
- `The export failed: The database has a table the export does not know`: de database heeft een tabel die niet in `packages/db/src/export-plan.ts` staat.
  Vraag een agent om de tabel in de lijst te zetten; tot dan komt er geen kopie.
- `docker is not installed here` of `service "mariadb" is not running`: start Docker en draai `docker compose up -d --wait`.
- `… has no table acceptance_copy`: je eigen client uit `MYSQL_COMMAND` laadde in een andere server dan die van `DATABASE_URL`.
