# Acceptatieomgeving

De acceptatieomgeving staat op <https://acc.sc.heerenveen.org>.
Het is een tweede website op de gedeelde hosting van mijn.host, naast het forum.
Elke merge naar `main` zet er een nieuwe versie van de site op.
Zo kijkt de groep een versie na voordat hij live gaat (productie komt met #33).

Op de host haalt de importer elke 15 minuten de koppen op van de bronnen.
Dit bestand zegt hoe dat werkt, wat de eigenaar eenmalig zelf instelt, en hoe je controleert dat het klopt.

## Zo werkt het

De workflow [`acceptance.yml`](../.github/workflows/acceptance.yml) doet bij elke merge naar `main` zes dingen:

1. Hij bouwt de site (`pnpm --filter site build`) en zet het resultaat in één map (`pnpm --filter site assemble`), met de migraties en de importer erbij.
   De importer is één JavaScript-bestand, `apps/importer/import.mjs`, dat `esbuild` maakt.
2. Hij start die map zoals de host dat doet en controleert wat een bezoeker en een zoekmachine krijgen (`pnpm --filter site smoke`).
   Daarvoor start de workflow een eigen MariaDB die na de run weer weg is.
   De rooktest maakt daarop lege databases, en de site maakt er zelf de tabellen en de testbronnen in.
   Ook als de database niet bereikbaar is, controleert hij dat de homepage en `/bronnen` de foutpagina tonen.
3. Hij draait de importer één keer uit die map, op dezelfde MariaDB.
   De database krijgt de tabellen maar niet de seed, dus er zijn geen feeds en de importer vraagt geen echte site iets.
   Start de importer niet of bereikt hij de database niet, dan wordt de run rood.
4. Hij kopieert de map met rsync over SSH, op poort 26, naar de map van de app op de host.
5. Hij raakt `tmp/restart.txt` aan, zodat de host de app opnieuw start.
6. Hij vraagt <https://acc.sc.heerenveen.org/bronnen> op, tot een minuut lang.
   Hij faalt als de pagina niet met 200 antwoordt of geen testbron toont.
   Zo geeft een migratie die op de host mislukt, een rode run.

Op de server bouwen we niets.
De map bevat de standalone build van Next.js met zijn eigen `node_modules`, zonder symbolische links.
Waarom dat zo is, staat onder _Wat de eerste deploy ons leerde_.
De importer heeft geen `node_modules` nodig: alles wat hij gebruikt, zit in zijn ene bestand.

Ontbreekt een van de geheimen hieronder, dan doet de workflow alleen stap 1 tot en met 3 en meldt dat het kopiëren is overgeslagen.
Stap 6 vervalt dan ook.
`main` wordt er niet rood van.

De site leest bij het opstarten de variabelen `SITE_ENV` en `DATABASE_URL`.
Op acceptatie is `SITE_ENV` `acceptance`.
Dan krijgt elk antwoord de header `X-Robots-Tag: noindex, nofollow`, en weigert `/robots.txt` alles.
`DATABASE_URL` wijst naar de database van acceptatie (stap 3 hieronder).
Zonder een van de twee start de site niet.

## Het schema en de testbronnen

De site zet de database zelf klaar als de host hem start.
Dat gebeurt in `register()` in `apps/site/src/instrumentation.ts`, en de site beantwoordt pas daarna verzoeken:

1. Hij draait de migraties die de database nog niet had.
   `assemble` zet ze in `packages/db/drizzle` van de map, twee mappen boven `apps/site`, want Next.js neemt de SQL-bestanden zelf niet mee.
2. Alleen met `SITE_ENV=acceptance` zet hij daarna de bronnen uit de seed in het register: de testbronnen en de Leeuwarder Courant met haar feed.
   Met `local` en `production` doet hij dat niet.
   Een bron die er al staat, werkt hij bij op haar domein, dus er komen geen dubbele.

Een slot in de database (`GET_LOCK`) zorgt dat twee processen die tegelijk starten, om de beurt migreren.
Het proces dat wacht, geeft na 30 seconden op en schrijft dat in het logboek.
Op een lege database maakt dit de tabellen.
Een nieuwe versie met een nieuwe migratie voegt die toe zodra de host hem start.

Lukt het niet, dan blijft de site draaien.
Een pagina die de database nodig heeft, zoals de homepage en `/bronnen`, toont de foutpagina "Er ging iets mis".
Het logboek zegt wat er misging (zie _Als het niet werkt_).
Lees het in _Setup Node.js App_ of in `stderr.log` in de map van de app.

`pnpm db:seed` op je eigen computer weigert als `SITE_ENV` `production` is.

## De import

Cron start op de host elke 15 minuten de importer, `apps/importer/import.mjs` in de map van de app.
Hij leest de feeds van de bronnen die aanstaan, nu de Leeuwarder Courant uit de seed, en zet de koppen in de tabel `items`.
Wat hij per feed schrijft, staat in de [README van de importer](../apps/importer/README.md).

- Cron start hem op minuut 7, 22, 37 en 52 van elk uur, niet op het hele kwartier: dan starten veel andere cronjobs.
- Een cronjob krijgt de variabelen van de Node.js-app niet.
  De importer leest `DATABASE_URL` daarom uit een eigen bestand in de thuismap, `~/fansite-acceptatie.env`, met `node --env-file`.
- De uitvoer komt achteraan in `~/fansite-import.log`, met de tijd van de run ervoor.
  Er gaat geen e-mail.
  Niets ruimt dat bestand op; het groeit met een paar regels per run.
- De importer weigert adressen die niet op het openbare internet liggen, zoals `localhost` of `10.0.0.1`, ook na een doorverwijzing.
- Er is nog geen lock in de database (#13).
  Een run duurt een paar seconden, dus twee runs halen elkaar niet in.

Elke deploy kopieert de importer samen met de site.
Zo past hij bij het schema, dat de site bijwerkt als de host haar start.

## Eenmalig instellen

De eigenaar doet dit zelf, in DirectAdmin en in GitHub.
Een agent heeft daar geen toegang.

1. **Subdomein.**
   Maak in DirectAdmin onder het domein `sc.heerenveen.org` het subdomein `acc` aan, dus `acc.sc.heerenveen.org`.
   Kies bij _Document Root_ de standaardmap (`/domains/acc.sc.heerenveen.org/public_html`).
   Vraag daarna een certificaat aan (Let's Encrypt), zonder wildcard.
   Let's Encrypt controleert zo via HTTP of het domein van jou is.
   Een wildcard-certificaat (`*.sc.heerenveen.org`) vraagt een controle via DNS, en die mislukte: de naamservers van mijn.host toonden de TXT-record voor de controle niet.
   Zonder certificaat geeft `https://acc.sc.heerenveen.org` een certificaatfout.
2. **Node.js-app.**
   Maak in DirectAdmin onder _Setup Node.js App_ een app:
   - Node.js-versie: 24.
   - Modus: Production.
   - Map van de app (_Application root_): een map buiten `public_html`, bijvoorbeeld `domains/acc.sc.heerenveen.org/app`.
     Het pad van deze map is straks `DEPLOY_PATH`.
   - Adres van de app (_Application URL_): `acc.sc.heerenveen.org`.
   - Startbestand (_Application startup file_): `apps/site/server.js`.
   - Omgevingsvariabelen: `SITE_ENV` met de waarde `acceptance`, en `DATABASE_URL` met de database uit stap 3, als `mysql://gebruiker:wachtwoord@localhost:3306/database`.
   - Kies **niet** _Run NPM Install_: de build brengt zijn eigen `node_modules` mee.
     Staat er in de map van de app al een `node_modules` die een symbolische link is, verwijder die link dan.

   Verwijder daarna het bestand `domains/acc.sc.heerenveen.org/public_html/index.html`.
   Dat is de plaatsvervangende pagina van mijn.host.
   Zolang hij er staat, toont `https://acc.sc.heerenveen.org` die pagina in plaats van de site.

3. **Database.**
   Maak onder _MySQL Management_ een lege database met een eigen gebruiker voor acceptatie.
   Bewaar de gegevens in je wachtwoordmanager.
   De site leest de bronnen voor `/bronnen` uit deze database.
   De gegevens komen nooit in GitHub of in de repository.
   De tabellen en de testbronnen zet de site er zelf in als de host hem start (zie _Het schema en de testbronnen_).
4. **SSH-sleutel voor de deploys.**
   Maak een sleutel die alleen hiervoor dient, zonder wachtwoord (de workflow kan er geen invullen):

   ```sh
   ssh-keygen -t ed25519 -N '' -C 'fansite acceptatie deploy' -f ~/.ssh/fansite-acceptatie
   ```

   Zet de publieke sleutel (`fansite-acceptatie.pub`) in DirectAdmin bij de SSH-sleutels van het account.
   Controleer dat inloggen werkt: `ssh -p 26 -i ~/.ssh/fansite-acceptatie <gebruiker>@<host>`.

5. **Hostsleutel.**
   De workflow vertrouwt alleen de host die je hier vastlegt.
   Haal de sleutel op met `ssh-keyscan -p 26 <host>` en vergelijk de vingerafdruk met die van mijn.host.
6. **GitHub.**
   Maak onder _Settings → Environments_ de omgeving `acceptatie` aan en beperk _Deployment branches_ tot `main`.
   Voeg deze geheimen toe aan die omgeving:

   | Geheim            | Wat erin staat                                                     |
   | ----------------- | ------------------------------------------------------------------ |
   | `SSH_PRIVATE_KEY` | De hele inhoud van `~/.ssh/fansite-acceptatie`                     |
   | `SSH_KNOWN_HOSTS` | De uitvoer van `ssh-keyscan -p 26 <host>`                          |
   | `SSH_HOST`        | De hostnaam van de SSH-server                                      |
   | `SSH_USER`        | De gebruikersnaam voor SSH, dezelfde als die van DirectAdmin       |
   | `DEPLOY_PATH`     | Het volledige pad van de map van de app, zonder slash aan het eind |

7. **Eerste deploy.**
   Start de workflow met _Actions → Acceptance → Run workflow_, of voeg een wijziging samen met `main`.

De import vraagt nog drie stappen op de host.
Log daarvoor in met SSH: `ssh -p 26 <gebruiker>@<host>`.

8. **Het bestand met `DATABASE_URL` voor de import.**
   Maak in de thuismap een bestand dat alleen jouw account mag lezen en schrijven:

   ```sh
   touch ~/fansite-acceptatie.env
   chmod 600 ~/fansite-acceptatie.env
   ```

   Open het met een editor, zoals `nano` of `vi`, en zet er één regel in, met dezelfde waarde als bij de Node.js-app (stap 2):

   ```sh
   DATABASE_URL=mysql://gebruiker:wachtwoord@localhost:3306/database
   ```

   Gebruik geen `echo`: dan komt het wachtwoord in de geschiedenis van je shell.
   `ls -l ~/fansite-acceptatie.env` moet beginnen met `-rw-------`.
   Het bestand staat buiten de map van de app en buiten `public_html`, dus de deploy raakt het niet aan en een bezoeker kan het niet opvragen.
   Het wachtwoord staat nu op twee plekken op de host.
   Verander je het, pas het dan hier en bij de Node.js-app aan.

9. **Het pad van Node 24.**
   Cron weet niet waar Node 24 staat, dus de opdracht noemt het volledige pad.
   Op hosting met CloudLinux staat elke versie van Node in een eigen map onder `/opt/alt`.
   Of dat op mijn.host zo is, weten we nog niet; deze opdrachten laten het zien:

   ```sh
   ls -d /opt/alt/alt-nodejs*/root/usr/bin/node
   /opt/alt/alt-nodejs24/root/usr/bin/node --version
   ```

   De eerste opdracht toont de versies die er zijn.
   De tweede moet een versie tonen die met `v24.` begint.
   Staat Node 24 daar niet, open dan in DirectAdmin _Setup Node.js App_ en kopieer de opdracht bovenaan de app, die met `source` begint.
   Draai die met SSH, en daarna `readlink -f "$(command -v node)"`.
   Dat toont het pad dat je in de opdracht hieronder gebruikt.

10. **De cronjob.**
    Open in DirectAdmin _Advanced Features → Cron Jobs_ en maak een cronjob:
    - Minuut: `7,22,37,52`.
    - Uur, dag van de maand, maand en dag van de week: `*`.
    - Opdracht, op één regel:

      ```sh
      (date; /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/<gebruiker>/fansite-acceptatie.env /home/<gebruiker>/domains/acc.sc.heerenveen.org/app/apps/importer/import.mjs) >> /home/<gebruiker>/fansite-import.log 2>&1
      ```

    Vervang `<gebruiker>` door je gebruikersnaam.
    Heet de map van de app anders, gebruik dan `DEPLOY_PATH` uit stap 6 in plaats van `/home/<gebruiker>/domains/acc.sc.heerenveen.org/app`.
    Gebruik het pad van Node uit stap 9 als dat anders is.
    Laat het e-mailadres voor de uitvoer van cron leeg.
    De opdracht schrijft alles in het logbestand, dus er is ook niets om te mailen.

## Controleren

- De pagina op <https://acc.sc.heerenveen.org> laat "sc Heerenveen Fansite" en "sc Heerenveen in de media" zien.
  Zolang de import op de host niet draait (zie _Eenmalig instellen_, stap 8 tot en met 10), staat er "We hebben deze week nog geen nieuws gevonden. Kijk straks nog eens."
  Daarna staan er de koppen van de Leeuwarder Courant van de afgelopen week.
  Toont hij "Er ging iets mis", dan kan de site de database niet lezen: kijk in het logboek.
- `curl -I https://acc.sc.heerenveen.org` toont `x-robots-tag: noindex, nofollow`.
  Die header staat ook bij `/robots.txt` en bij een pagina die niet bestaat.
- <https://acc.sc.heerenveen.org/robots.txt> toont `Disallow: /`.
- <https://acc.sc.heerenveen.org/bestaat-niet> toont de Nederlandse 404-pagina "Pagina niet gevonden".
- <https://acc.sc.heerenveen.org/bronnen> toont "Onze bronnen" met de testbronnen, zoals Testkrant, en de Leeuwarder Courant.
  Toont hij "Er ging iets mis", dan kan de site de database niet lezen: kijk in het logboek.
- De import werkt als `tail -n 20 ~/fansite-import.log` na een kwartier een tijd toont, met een regel voor de feed eronder:

  ```text
  Thu Oct 22 14:07:01 CEST 2026
  https://www.lc.nl/sport/sc-heerenveen/rss/: 3 new, 0 updated, 47 unchanged, 0 skipped
  ```

  Wil je niet wachten, draai dan de opdracht van de cronjob met SSH, zonder het deel vanaf `>>`.
  Dan zie je de uitvoer meteen.

- In de database staan de koppen in de tabel `items`: `SELECT COUNT(*) FROM items` in phpMyAdmin telt ze.

## Als het niet werkt

- De workflow meldt "Deploy skipped": een geheim ontbreekt.
  De melding noemt welk.
- De site start niet: kijk in het logboek van de app (_Setup Node.js App_ of het bestand `stderr.log` in de map van de app).
  Een ontbrekende of verkeerde `SITE_ENV` of `DATABASE_URL` staat daar met naam bij.
- De workflow is rood bij _Check the sources page on acceptance_, of `/bronnen` toont "Er ging iets mis": de database is niet klaar.
  Het logboek heeft dan een regel die begint met `Could not bring the database up to date`, met de reden erachter:

  | Reden in het logboek                              | Wat je doet                                                                                                                                                        |
  | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `connect ECONNREFUSED` of `getaddrinfo ENOTFOUND` | De database is niet bereikbaar. Controleer de host en de poort in `DATABASE_URL`.                                                                                  |
  | `Access denied for user`                          | De gebruiker of het wachtwoord in `DATABASE_URL` klopt niet.                                                                                                       |
  | `Unknown database`                                | De database bestaat niet. Maak hem aan onder _MySQL Management_.                                                                                                   |
  | `Could not get the lock`                          | Een ander proces migreert nog. Raak `tmp/restart.txt` aan om de app opnieuw te starten.                                                                            |
  | `Failed query` met een SQL-fout erachter          | Een migratie of de seed faalde. De fout noemt waarom. Een migratie die halverwege faalt, kan tabellen half hebben veranderd; kijk dan in de database wat er staat. |

  Is de database weer in orde, start de app dan opnieuw (raak `tmp/restart.txt` aan).
  De site probeert de migraties alleen bij het starten.

- Een bezoeker kreeg "Er ging iets mis" op `/bronnen` of de homepage, terwijl de start goed ging: de regel `Could not read the sources for /bronnen` of `Could not read the headlines for the homepage` in het logboek noemt de reden.
  De database was dan waarschijnlijk even niet bereikbaar.
  Een mislukte vraag bewaart de site niet, dus de volgende bezoeker krijgt het opnieuw geprobeerd.
- De site geeft een 500 en `stderr.log` zegt `Cannot find module '@swc/helpers/...'`: de map op de host bevat symbolische links.
  `pnpm --filter site assemble` haalt ze weg en stopt als er een overblijft.
  Controleer de map op de host met `find <map van de app> -type l`; die opdracht mag niets tonen.
- De import werkt niet: kijk in `~/fansite-import.log`.
  Elke run begint met de tijd.
  Komen er geen nieuwe tijden bij, dan start cron de opdracht niet: controleer de cronjob in DirectAdmin.
  Anders staat de reden onder de tijd:

  | Wat er in het logbestand staat                              | Wat je doet                                                                                                                                                          |
  | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Het pad van Node met `No such file or directory`            | Het pad van Node klopt niet. Zoek het op zoals in stap 9.                                                                                                            |
  | `node: /home/<gebruiker>/fansite-acceptatie.env: not found` | Het bestand met `DATABASE_URL` ontbreekt of heeft een andere naam. Maak het zoals in stap 8.                                                                         |
  | `Cannot find module` met het pad van `import.mjs`           | Het pad van de app in de opdracht klopt niet, of de deploy heeft de importer nog niet gekopieerd. Controleer het met `ls <map van de app>/apps/importer/import.mjs`. |
  | `DATABASE_URL is missing` of `DATABASE_URL: Invalid URL`    | Het bestand heeft geen regel `DATABASE_URL=…`, of de waarde is geen goede URL. Kopieer de waarde van de Node.js-app.                                                 |
  | `Access denied for user`                                    | De gebruiker of het wachtwoord in het bestand klopt niet. Kopieer de waarde van de Node.js-app; is het wachtwoord veranderd, pas het dan op beide plekken aan.       |
  | `connect ECONNREFUSED` of `getaddrinfo ENOTFOUND`           | De database is niet bereikbaar. Controleer de host en de poort in het bestand.                                                                                       |
  | `Table '…feeds' doesn't exist`                              | De database heeft de tabellen nog niet. De site maakt ze als de host haar start: open <https://acc.sc.heerenveen.org> en wacht op de volgende run.                   |
  | Een regel met `failed,` achter het adres van een feed       | De importer startte, maar las die feed niet. De reden staat erachter; de volgende run probeert het opnieuw.                                                          |

## Wat de eerste deploy ons leerde

We hadden bij het bouwen geen toegang tot de hosting.
De eerste deploy, op 21 oktober 2026, liet zien hoe die werkt:

- De host start de app met `lsnode.js` van LiteSpeed, niet met Passenger zelf, op Node 24.20 en zonder bijzondere opties.
  `apps/site/server.js` is een ES-module en laadt zonder omweg.
- Op de host staat rsync (`/usr/bin/rsync`).
  Met `--delete` en de uitzonderingen in de workflow bleven `tmp/` en `stderr.log` staan.
- De app start opnieuw zodra iemand `tmp/restart.txt` aanraakt.
- Een map met symbolische links, zoals pnpm ze maakt, werkte niet.
  Node laadt op de host één bestand van Next.js via het pad van de link, en zoekt de pakketten naast Next.js dan op de verkeerde plek.
  Lokaal en in CI gebeurt dat niet, dus de rooktest zag het niet.
  Waarom Node dat op de host doet, is niet uitgezocht.
  `assemble` maakt daarom een platte `node_modules` van echte mappen (zie `docs/beslissingen.md`).
- Een bestand in `public_html` gaat voor de app.
  De plaatsvervangende pagina `index.html` verborg daarom de site op `/`, tot we hem verwijderden.

## Productie

Productie komt met #33, met een eigen omgeving in GitHub en een eigen app op de hosting.
Die app krijgt `SITE_ENV=production`; zonder die waarde blijft de site uit de zoekmachines.
